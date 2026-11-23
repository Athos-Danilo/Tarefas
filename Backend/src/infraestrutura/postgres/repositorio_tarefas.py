from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID, uuid4

from sqlalchemy import bindparam, delete, func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from contratos.persistencia import FabricaSessaoRelacional
from contratos.tarefas import (
    EtiquetaRegistro,
    LembreteResumo,
    ResponsavelTarefaResumo,
    TarefaRegistro,
)
from dominio.autenticacao import resolver_url_avatar
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import (
    ConfiguracaoRecorrencia,
    EspecificacaoProximaOcorrencia,
    NoTarefa,
    PrioridadeTarefa,
    StatusTarefa,
    TipoRecorrencia,
    TurnoTarefa,
)
from infraestrutura.postgres.modelos import (
    EtiquetaModelo,
    LembreteTarefaModelo,
    MembroTarefaModelo,
    TarefaEtiquetaModelo,
    TarefaModelo,
    UsuarioModelo,
    VagaTarefaModelo,
)


def _para_config_recorrencia(modelo: TarefaModelo) -> ConfiguracaoRecorrencia:
    tipo = cast(TipoRecorrencia, modelo.recorrencia_tipo)
    if tipo == "nenhuma":
        return ConfiguracaoRecorrencia()
    dados = modelo.recorrencia_config if isinstance(modelo.recorrencia_config, dict) else {}
    dias_brutos = dados.get("dias_semana", [])
    dias = (
        tuple(int(d) for d in dias_brutos if isinstance(d, int))
        if isinstance(dias_brutos, list)
        else ()
    )
    dia_mes_bruto = dados.get("dia_mes")
    dia_mes = int(dia_mes_bruto) if isinstance(dia_mes_bruto, int) else None
    intervalo_bruto = dados.get("intervalo", 1)
    intervalo = int(intervalo_bruto) if isinstance(intervalo_bruto, int) else 1
    return ConfiguracaoRecorrencia(
        tipo=tipo,
        dias_semana=dias,
        dia_mes=dia_mes,
        intervalo=intervalo,
    )


def _serializar_recorrencia(
    config: ConfiguracaoRecorrencia,
) -> tuple[str, dict[str, Any] | None]:
    if config.tipo == "nenhuma":
        return "nenhuma", None
    return config.tipo, {
        "dias_semana": list(config.dias_semana),
        "dia_mes": config.dia_mes,
        "intervalo": config.intervalo,
    }


def _para_registro_tarefa(
    modelo: TarefaModelo,
    etiquetas: tuple[EtiquetaRegistro, ...],
    lembretes_pendentes: int,
    responsavel: ResponsavelTarefaResumo | None,
) -> TarefaRegistro:
    return TarefaRegistro(
        id=modelo.id,
        usuario_id=modelo.usuario_id,
        tarefa_pai_id=modelo.tarefa_pai_id,
        titulo=modelo.titulo,
        prioridade=cast(PrioridadeTarefa, modelo.prioridade),
        status=cast(StatusTarefa, modelo.status),
        turno=cast(TurnoTarefa, modelo.turno),
        prazo=modelo.prazo,
        profundidade=modelo.profundidade,
        ordem_manual=modelo.ordem_manual,
        recorrencia=_para_config_recorrencia(modelo),
        serie_recorrencia_id=modelo.serie_recorrencia_id,
        vezes_reaberta=modelo.vezes_reaberta,
        concluida_em=modelo.concluida_em,
        criado_em=modelo.criado_em,
        atualizado_em=modelo.atualizado_em,
        etiquetas=etiquetas,
        lembretes_pendentes=lembretes_pendentes,
        compartilhada=modelo.compartilhada,
        responsavel_usuario_id=modelo.responsavel_usuario_id,
        vaga_responsavel_id=modelo.vaga_responsavel_id,
        responsavel=responsavel,
    )


async def hidratar_tarefas_lista(
    sessao: AsyncSession,
    usuario_id: UUID,
    modelos: Sequence[TarefaModelo],
) -> list[TarefaRegistro]:
    """Hidrata etiquetas, lembretes pendentes do usuario e responsavel em lote."""
    if not modelos:
        return []
    ids = [m.id for m in modelos]

    linhas_etiquetas = (
        await sessao.execute(
            select(TarefaEtiquetaModelo.tarefa_id, EtiquetaModelo)
            .join(EtiquetaModelo, EtiquetaModelo.id == TarefaEtiquetaModelo.etiqueta_id)
            .where(TarefaEtiquetaModelo.tarefa_id.in_(ids))
            .order_by(EtiquetaModelo.nome_normalizado.asc())
        )
    ).all()
    etiquetas_por_tarefa: dict[UUID, list[EtiquetaRegistro]] = defaultdict(list)
    for tid, etq in linhas_etiquetas:
        etiquetas_por_tarefa[tid].append(
            EtiquetaRegistro(
                id=etq.id,
                usuario_id=etq.usuario_id,
                nome=etq.nome,
                cor=etq.cor,
                criado_em=etq.criado_em,
            )
        )

    linhas_lembretes = (
        await sessao.execute(
            select(LembreteTarefaModelo.tarefa_id, func.count(LembreteTarefaModelo.id))
            .where(
                LembreteTarefaModelo.usuario_id == usuario_id,
                LembreteTarefaModelo.tarefa_id.in_(ids),
                LembreteTarefaModelo.status == "pendente",
            )
            .group_by(LembreteTarefaModelo.tarefa_id)
        )
    ).all()
    contagem_lembretes: dict[UUID, int] = {tid: int(qtd) for tid, qtd in linhas_lembretes}

    resp_uids = list({m.responsavel_usuario_id for m in modelos if m.responsavel_usuario_id})
    usuarios_resp: dict[UUID, UsuarioModelo] = {}
    if resp_uids:
        for usr in (
            (await sessao.execute(select(UsuarioModelo).where(UsuarioModelo.id.in_(resp_uids))))
            .scalars()
            .all()
        ):
            usuarios_resp[usr.id] = usr

    resp_vids = list({m.vaga_responsavel_id for m in modelos if m.vaga_responsavel_id})
    vagas_resp: dict[UUID, VagaTarefaModelo] = {}
    if resp_vids:
        for vaga in (
            (
                await sessao.execute(
                    select(VagaTarefaModelo).where(VagaTarefaModelo.id.in_(resp_vids))
                )
            )
            .scalars()
            .all()
        ):
            vagas_resp[vaga.id] = vaga

    saida: list[TarefaRegistro] = []
    for m in modelos:
        resumo_resp: ResponsavelTarefaResumo | None = None
        if m.responsavel_usuario_id and m.responsavel_usuario_id in usuarios_resp:
            u = usuarios_resp[m.responsavel_usuario_id]
            resumo_resp = ResponsavelTarefaResumo(
                tipo="usuario",
                usuario_id=u.id,
                vaga_id=None,
                nome_exibicao=u.nome_exibicao,
                avatar_url=resolver_url_avatar(
                    avatar_tipo=u.avatar_tipo,
                    avatar_id=u.avatar_id,
                    foto_google_url=u.foto_google_url,
                    avatar_arquivo=u.avatar_arquivo,
                    versao_cache=int(u.atualizado_em.timestamp()),
                ),
            )
        elif m.vaga_responsavel_id and m.vaga_responsavel_id in vagas_resp:
            v = vagas_resp[m.vaga_responsavel_id]
            resumo_resp = ResponsavelTarefaResumo(
                tipo="vaga",
                usuario_id=None,
                vaga_id=v.id,
                nome_exibicao=v.nome_exibicao,
                avatar_url=None,
            )

        saida.append(
            _para_registro_tarefa(
                m,
                tuple(etiquetas_por_tarefa.get(m.id, [])),
                contagem_lembretes.get(m.id, 0),
                resumo_resp,
            )
        )
    return saida


async def _resolver_raiz_autorizada(
    sessao: AsyncSession,
    usuario_id: UUID,
    tarefa_id: UUID,
) -> tuple[UUID, UUID, bool] | None:
    cte = text(
        """
        WITH RECURSIVE ancestrais AS (
            SELECT id, tarefa_pai_id, usuario_id, compartilhada
            FROM tarefas
            WHERE id = :tarefa_id
            UNION ALL
            SELECT p.id, p.tarefa_pai_id, p.usuario_id, p.compartilhada
            FROM tarefas p
            INNER JOIN ancestrais a ON a.tarefa_pai_id = p.id
        )
        SELECT id, usuario_id, compartilhada
        FROM ancestrais
        WHERE tarefa_pai_id IS NULL
        LIMIT 1
        """
    )
    linha = (await sessao.execute(cte, {"tarefa_id": tarefa_id})).first()
    if linha is None:
        return None
    raiz_id = cast(UUID, linha[0])
    dono_id = cast(UUID, linha[1])
    compartilhada = bool(linha[2])
    if dono_id == usuario_id:
        return raiz_id, dono_id, compartilhada
    if not compartilhada:
        return None
    membro = (
        await sessao.execute(
            select(MembroTarefaModelo.id).where(
                MembroTarefaModelo.tarefa_raiz_id == raiz_id,
                MembroTarefaModelo.usuario_id == usuario_id,
            )
        )
    ).scalar_one_or_none()
    if membro is None:
        return None
    return raiz_id, dono_id, True


async def _proxima_ordem_manual(
    sessao: AsyncSession,
    usuario_id: UUID,
    tarefa_pai_id: UUID | None,
) -> int:
    condicao_pai = (
        TarefaModelo.tarefa_pai_id.is_(None)
        if tarefa_pai_id is None
        else TarefaModelo.tarefa_pai_id == tarefa_pai_id
    )
    maior = (
        await sessao.execute(
            select(func.coalesce(func.max(TarefaModelo.ordem_manual), 0)).where(
                TarefaModelo.usuario_id == usuario_id,
                condicao_pai,
            )
        )
    ).scalar_one()
    return int(maior) + 1


class RepositorioTarefasPostgres:
    """Adaptador transacional PostgreSQL com CTE recursiva e acesso compartilhado."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def listar_todas_do_usuario(self, usuario_id: UUID) -> list[TarefaRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            raizes_membro = list(
                (
                    await sessao.execute(
                        select(MembroTarefaModelo.tarefa_raiz_id).where(
                            MembroTarefaModelo.usuario_id == usuario_id
                        )
                    )
                )
                .scalars()
                .all()
            )

            ids_compartilhados: list[UUID] = []
            if raizes_membro:
                cte_comp = text(
                    """
                    WITH RECURSIVE compartilhadas AS (
                        SELECT id
                        FROM tarefas
                        WHERE id IN :raizes
                        UNION ALL
                        SELECT t.id
                        FROM tarefas t
                        INNER JOIN compartilhadas c ON t.tarefa_pai_id = c.id
                    )
                    SELECT id FROM compartilhadas
                    """
                ).bindparams(bindparam("raizes", expanding=True))
                ids_compartilhados = list(
                    (await sessao.execute(cte_comp, {"raizes": raizes_membro})).scalars().all()
                )

            filtro = (
                or_(TarefaModelo.usuario_id == usuario_id, TarefaModelo.id.in_(ids_compartilhados))
                if ids_compartilhados
                else TarefaModelo.usuario_id == usuario_id
            )
            modelos = (
                (
                    await sessao.execute(
                        select(TarefaModelo)
                        .where(filtro)
                        .order_by(
                            TarefaModelo.profundidade.asc(),
                            TarefaModelo.ordem_manual.asc(),
                            TarefaModelo.criado_em.asc(),
                        )
                    )
                )
                .scalars()
                .all()
            )
            return await hidratar_tarefas_lista(sessao, usuario_id, modelos)

    async def obter_por_id(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> TarefaRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            autorizado = await _resolver_raiz_autorizada(sessao, usuario_id, tarefa_id)
            if autorizado is None:
                return None
            modelo = await sessao.get(TarefaModelo, tarefa_id)
            if modelo is None:
                return None
            hidratadas = await hidratar_tarefas_lista(sessao, usuario_id, [modelo])
            return hidratadas[0]

    async def obter_subarvore_cte(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> list[TarefaRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            autorizado = await _resolver_raiz_autorizada(sessao, usuario_id, tarefa_id)
            if autorizado is None:
                return []
            _, dono_id, _ = autorizado

            cte = text(
                """
                WITH RECURSIVE subarvore AS (
                    SELECT id, tarefa_pai_id
                    FROM tarefas
                    WHERE id = :raiz_id AND usuario_id = :dono_id
                    UNION ALL
                    SELECT t.id, t.tarefa_pai_id
                    FROM tarefas t
                    INNER JOIN subarvore s ON t.tarefa_pai_id = s.id
                    WHERE t.usuario_id = :dono_id
                )
                SELECT id FROM subarvore
                """
            )
            ids: list[UUID] = list(
                (await sessao.execute(cte, {"raiz_id": tarefa_id, "dono_id": dono_id}))
                .scalars()
                .all()
            )
            if not ids:
                return []
            modelos = (
                (
                    await sessao.execute(
                        select(TarefaModelo)
                        .where(
                            TarefaModelo.usuario_id == dono_id,
                            TarefaModelo.id.in_(ids),
                        )
                        .order_by(
                            TarefaModelo.profundidade.asc(),
                            TarefaModelo.ordem_manual.asc(),
                            TarefaModelo.criado_em.asc(),
                        )
                    )
                )
                .scalars()
                .all()
            )
            return await hidratar_tarefas_lista(sessao, usuario_id, modelos)

    async def listar_lembretes_da_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> list[LembreteResumo]:
        async with self._fabrica.obter_sessao() as sessao:
            modelos = (
                (
                    await sessao.execute(
                        select(LembreteTarefaModelo)
                        .where(
                            LembreteTarefaModelo.usuario_id == usuario_id,
                            LembreteTarefaModelo.tarefa_id == tarefa_id,
                            LembreteTarefaModelo.status != "cancelado",
                        )
                        .order_by(LembreteTarefaModelo.disparar_em.asc())
                    )
                )
                .scalars()
                .all()
            )
            return [
                LembreteResumo(
                    id=m.id,
                    disparar_em=m.disparar_em,
                    antecedencia_min=m.antecedencia_min,
                    status=m.status,
                )
                for m in modelos
            ]

    async def criar_tarefa_atomica(
        self,
        *,
        usuario_id: UUID,
        tarefa_pai_id: UUID | None,
        titulo: str,
        prioridade: PrioridadeTarefa,
        status: StatusTarefa,
        turno: TurnoTarefa,
        prazo: datetime | None,
        profundidade: int,
        recorrencia: ConfiguracaoRecorrencia,
        serie_recorrencia_id: UUID | None,
        etiqueta_ids: tuple[UUID, ...],
        ancestrais_a_reabrir: tuple[UUID, ...],
        compartilhada: bool = False,
        responsavel_usuario_id: UUID | None = None,
    ) -> TarefaRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            agora = datetime.now(UTC)
            ordem = await _proxima_ordem_manual(sessao, usuario_id, tarefa_pai_id)
            rec_tipo, rec_cfg = _serializar_recorrencia(recorrencia)
            nova = TarefaModelo(
                id=uuid4(),
                usuario_id=usuario_id,
                tarefa_pai_id=tarefa_pai_id,
                titulo=titulo,
                prioridade=prioridade,
                status=status,
                turno=turno,
                prazo=prazo,
                profundidade=profundidade,
                ordem_manual=ordem,
                recorrencia_tipo=rec_tipo,
                recorrencia_config=rec_cfg,
                serie_recorrencia_id=serie_recorrencia_id,
                compartilhada=compartilhada,
                responsavel_usuario_id=responsavel_usuario_id,
                concluida_em=agora if status == "concluida" else None,
                criado_em=agora,
                atualizado_em=agora,
            )
            sessao.add(nova)
            await sessao.flush()

            if etiqueta_ids:
                sessao.add_all(
                    [
                        TarefaEtiquetaModelo(tarefa_id=nova.id, etiqueta_id=eid)
                        for eid in etiqueta_ids
                    ]
                )

            if ancestrais_a_reabrir:
                await sessao.execute(
                    update(TarefaModelo)
                    .where(
                        TarefaModelo.usuario_id == usuario_id,
                        TarefaModelo.id.in_(list(ancestrais_a_reabrir)),
                    )
                    .values(status="em_andamento", concluida_em=None, atualizado_em=agora)
                )

            await sessao.commit()
            await sessao.refresh(nova)
            return (await hidratar_tarefas_lista(sessao, usuario_id, [nova]))[0]

    async def atualizar_tarefa_atomica(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        titulo: str,
        prioridade: PrioridadeTarefa,
        turno: TurnoTarefa,
        prazo: datetime | None,
        recorrencia: ConfiguracaoRecorrencia,
        serie_recorrencia_id: UUID | None,
        etiqueta_ids: tuple[UUID, ...] | None,
        status: StatusTarefa | None = None,
    ) -> TarefaRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = (
                await sessao.execute(
                    select(TarefaModelo).where(
                        TarefaModelo.id == tarefa_id,
                        TarefaModelo.usuario_id == usuario_id,
                    )
                )
            ).scalar_one_or_none()
            if modelo is None:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa nao encontrada.",
                    status_http=404,
                )

            rec_tipo, rec_cfg = _serializar_recorrencia(recorrencia)
            modelo.titulo = titulo
            modelo.prioridade = prioridade
            modelo.turno = turno
            modelo.prazo = prazo
            modelo.recorrencia_tipo = rec_tipo
            modelo.recorrencia_config = rec_cfg
            modelo.serie_recorrencia_id = serie_recorrencia_id
            if status is not None:
                modelo.status = status
            modelo.atualizado_em = datetime.now(UTC)

            if etiqueta_ids is not None:
                await sessao.execute(
                    delete(TarefaEtiquetaModelo).where(TarefaEtiquetaModelo.tarefa_id == tarefa_id)
                )
                if etiqueta_ids:
                    sessao.add_all(
                        [
                            TarefaEtiquetaModelo(tarefa_id=tarefa_id, etiqueta_id=eid)
                            for eid in etiqueta_ids
                        ]
                    )

            await sessao.commit()
            await sessao.refresh(modelo)
            return (await hidratar_tarefas_lista(sessao, usuario_id, [modelo]))[0]

    async def aplicar_mudancas_arvore_atomica(
        self,
        *,
        usuario_id: UUID,
        nos_modificados: Sequence[NoTarefa],
        ids_concluidos_cancelar_lembretes: tuple[UUID, ...] = (),
        nova_ocorrencia: EspecificacaoProximaOcorrencia | None = None,
        etiquetas_ocorrencia_ids: tuple[UUID, ...] = (),
    ) -> TarefaRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            agora = datetime.now(UTC)
            for no in nos_modificados:
                await sessao.execute(
                    update(TarefaModelo)
                    .where(TarefaModelo.id == no.id, TarefaModelo.usuario_id == usuario_id)
                    .values(
                        tarefa_pai_id=no.tarefa_pai_id,
                        profundidade=no.profundidade,
                        status=no.status,
                        vezes_reaberta=no.vezes_reaberta,
                        concluida_em=no.concluida_em,
                        atualizado_em=agora,
                    )
                )

            if ids_concluidos_cancelar_lembretes:
                await sessao.execute(
                    update(LembreteTarefaModelo)
                    .where(
                        LembreteTarefaModelo.tarefa_id.in_(list(ids_concluidos_cancelar_lembretes)),
                        LembreteTarefaModelo.status == "pendente",
                    )
                    .values(status="cancelado")
                )

            modelo_ocorrencia: TarefaModelo | None = None
            if nova_ocorrencia is not None:
                ordem = await _proxima_ordem_manual(
                    sessao,
                    usuario_id,
                    nova_ocorrencia.tarefa_pai_id,
                )
                rec_tipo, rec_cfg = _serializar_recorrencia(nova_ocorrencia.recorrencia)
                modelo_ocorrencia = TarefaModelo(
                    id=uuid4(),
                    usuario_id=usuario_id,
                    tarefa_pai_id=nova_ocorrencia.tarefa_pai_id,
                    titulo=nova_ocorrencia.titulo,
                    prioridade=nova_ocorrencia.prioridade,
                    status="pendente",
                    turno=nova_ocorrencia.turno,
                    prazo=nova_ocorrencia.proximo_prazo,
                    profundidade=nova_ocorrencia.profundidade,
                    ordem_manual=ordem,
                    recorrencia_tipo=rec_tipo,
                    recorrencia_config=rec_cfg,
                    serie_recorrencia_id=nova_ocorrencia.serie_recorrencia_id,
                    criado_em=agora,
                    atualizado_em=agora,
                )
                sessao.add(modelo_ocorrencia)
                await sessao.flush()
                if etiquetas_ocorrencia_ids:
                    sessao.add_all(
                        [
                            TarefaEtiquetaModelo(
                                tarefa_id=modelo_ocorrencia.id,
                                etiqueta_id=eid,
                            )
                            for eid in etiquetas_ocorrencia_ids
                        ]
                    )

            await sessao.commit()
            if modelo_ocorrencia is None:
                return None
            await sessao.refresh(modelo_ocorrencia)
            return (await hidratar_tarefas_lista(sessao, usuario_id, [modelo_ocorrencia]))[0]

    async def reordenar_irmas_atomica(
        self,
        *,
        usuario_id: UUID,
        tarefa_pai_id: UUID | None,
        itens_ordenacao: Sequence[tuple[UUID, int]],
    ) -> int:
        if not itens_ordenacao:
            return 0
        async with self._fabrica.obter_sessao() as sessao:
            ids = [item[0] for item in itens_ordenacao]
            condicao_pai = (
                TarefaModelo.tarefa_pai_id.is_(None)
                if tarefa_pai_id is None
                else TarefaModelo.tarefa_pai_id == tarefa_pai_id
            )
            encontradas = (
                (
                    await sessao.execute(
                        select(TarefaModelo.id).where(
                            TarefaModelo.usuario_id == usuario_id,
                            condicao_pai,
                            TarefaModelo.id.in_(ids),
                        )
                    )
                )
                .scalars()
                .all()
            )
            if len(encontradas) != len(set(ids)):
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Uma ou mais tarefas informadas nao pertencem a este nivel.",
                    status_http=404,
                )

            agora = datetime.now(UTC)
            for tarefa_id, ordem in itens_ordenacao:
                await sessao.execute(
                    update(TarefaModelo)
                    .where(
                        TarefaModelo.id == tarefa_id,
                        TarefaModelo.usuario_id == usuario_id,
                    )
                    .values(ordem_manual=ordem, atualizado_em=agora)
                )
            await sessao.commit()
            return len(itens_ordenacao)

    async def excluir_tarefas_atomica(
        self,
        *,
        usuario_id: UUID,
        nos_atualizados: Sequence[NoTarefa],
        ids_remover: tuple[UUID, ...],
    ) -> None:
        async with self._fabrica.obter_sessao() as sessao:
            agora = datetime.now(UTC)
            for no in nos_atualizados:
                await sessao.execute(
                    update(TarefaModelo)
                    .where(TarefaModelo.id == no.id, TarefaModelo.usuario_id == usuario_id)
                    .values(
                        tarefa_pai_id=no.tarefa_pai_id,
                        profundidade=no.profundidade,
                        status=no.status,
                        concluida_em=no.concluida_em,
                        atualizado_em=agora,
                    )
                )
            # Atualiza tarefa_pai_id antes do DELETE para evitar cascata em filhas promovidas.
            await sessao.flush()

            if ids_remover:
                await sessao.execute(
                    delete(TarefaModelo).where(
                        TarefaModelo.usuario_id == usuario_id,
                        TarefaModelo.id.in_(list(ids_remover)),
                    )
                )
            await sessao.commit()
