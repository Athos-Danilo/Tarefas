import secrets
from datetime import UTC, datetime
from typing import cast
from uuid import UUID, uuid4

from sqlalchemy import delete, func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from contratos.grupos import (
    ContextoGrupoDaTarefa,
    ConviteGrupoRegistro,
    MembroGrupoRegistro,
    PreviaConviteRegistro,
    ResultadoEntradaGrupoRegistro,
    ResultadoSaidaGrupoRegistro,
    VagaGrupoRegistro,
)
from contratos.persistencia import FabricaSessaoRelacional
from contratos.tarefas import TarefaRegistro
from dominio.autenticacao import resolver_url_avatar
from dominio.erros import ErroDeDominio
from dominio.grupos import (
    PapelGrupo,
    VagaGrupoInfo,
    resolver_vaga_na_entrada,
    validar_limite_membros,
    validar_limite_vagas,
)
from infraestrutura.postgres.modelos import (
    ConviteTarefaModelo,
    MembroTarefaModelo,
    TarefaModelo,
    UsuarioModelo,
    VagaTarefaModelo,
)
from infraestrutura.postgres.repositorio_tarefas import hidratar_tarefas_lista


def _para_vaga_registro(modelo: VagaTarefaModelo) -> VagaGrupoRegistro:
    return VagaGrupoRegistro(
        id=modelo.id,
        tarefa_raiz_id=modelo.tarefa_raiz_id,
        nome_exibicao=modelo.nome_exibicao,
        email_opcional=modelo.email_opcional,
        ocupada_por_usuario_id=modelo.ocupada_por_usuario_id,
        criada_em=modelo.criada_em,
    )


def _para_convite_registro(modelo: ConviteTarefaModelo) -> ConviteGrupoRegistro:
    return ConviteGrupoRegistro(
        id=modelo.id,
        tarefa_raiz_id=modelo.tarefa_raiz_id,
        codigo_token=modelo.codigo_token,
        criado_por_usuario_id=modelo.criado_por_usuario_id,
        ativo=modelo.ativo,
        expira_em=modelo.expira_em,
        criado_em=modelo.criado_em,
        revogado_em=modelo.revogado_em,
    )


async def _coletar_ids_arvore(sessao: AsyncSession, raiz_id: UUID) -> list[UUID]:
    cte = text(
        """
        WITH RECURSIVE subarvore AS (
            SELECT id FROM tarefas WHERE id = :raiz_id
            UNION ALL
            SELECT t.id FROM tarefas t INNER JOIN subarvore s ON t.tarefa_pai_id = s.id
        )
        SELECT id FROM subarvore
        """
    )
    return list((await sessao.execute(cte, {"raiz_id": raiz_id})).scalars().all())


async def _listar_membros_sessao(
    sessao: AsyncSession,
    tarefa_raiz_id: UUID,
) -> list[MembroGrupoRegistro]:
    linhas = (
        await sessao.execute(
            select(MembroTarefaModelo, UsuarioModelo)
            .join(UsuarioModelo, UsuarioModelo.id == MembroTarefaModelo.usuario_id)
            .where(MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id)
            .order_by(MembroTarefaModelo.papel.desc(), MembroTarefaModelo.entrou_em.asc())
        )
    ).all()
    saida: list[MembroGrupoRegistro] = []
    for membro, usuario in linhas:
        saida.append(
            MembroGrupoRegistro(
                id=membro.id,
                tarefa_raiz_id=membro.tarefa_raiz_id,
                usuario_id=membro.usuario_id,
                nome_exibicao=usuario.nome_exibicao,
                email=usuario.email,
                avatar_url=resolver_url_avatar(
                    avatar_tipo=usuario.avatar_tipo,
                    avatar_id=usuario.avatar_id,
                    foto_google_url=usuario.foto_google_url,
                    avatar_arquivo=usuario.avatar_arquivo,
                    versao_cache=int(usuario.atualizado_em.timestamp()),
                ),
                papel=cast(PapelGrupo, membro.papel),
                entrou_em=membro.entrou_em,
            )
        )
    return saida


async def _buscar_convite_valido(
    sessao: AsyncSession,
    codigo_token: str,
    agora: datetime,
) -> ConviteTarefaModelo:
    convite = (
        await sessao.execute(
            select(ConviteTarefaModelo).where(
                ConviteTarefaModelo.codigo_token == codigo_token,
                ConviteTarefaModelo.ativo.is_(True),
                or_(
                    ConviteTarefaModelo.expira_em.is_(None),
                    ConviteTarefaModelo.expira_em > agora,
                ),
            )
        )
    ).scalar_one_or_none()
    if convite is None:
        raise ErroDeDominio(
            codigo="CONVITE_INVALIDO_OU_REVOGADO",
            mensagem="Link de convite invalido, revogado ou expirado.",
            status_http=404,
        )
    return convite


class RepositorioGruposPostgres:
    """Adaptador PostgreSQL para compartilhamento, vagas, convites e lideranca."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def obter_contexto_por_tarefa(
        self,
        usuario_solicitante_id: UUID,
        tarefa_id: UUID,
    ) -> ContextoGrupoDaTarefa | None:
        async with self._fabrica.obter_sessao() as sessao:
            cte_raiz = text(
                """
                WITH RECURSIVE ancestrais AS (
                    SELECT id, tarefa_pai_id, titulo, usuario_id, compartilhada
                    FROM tarefas
                    WHERE id = :tarefa_id
                    UNION ALL
                    SELECT p.id, p.tarefa_pai_id, p.titulo, p.usuario_id, p.compartilhada
                    FROM tarefas p
                    INNER JOIN ancestrais a ON a.tarefa_pai_id = p.id
                )
                SELECT id, titulo, usuario_id, compartilhada
                FROM ancestrais
                WHERE tarefa_pai_id IS NULL
                LIMIT 1
                """
            )
            linha = (await sessao.execute(cte_raiz, {"tarefa_id": tarefa_id})).first()
            if linha is None:
                return None

            raiz_id = cast(UUID, linha[0])
            titulo_raiz = str(linha[1])
            dono_id = cast(UUID, linha[2])
            compartilhada = bool(linha[3])

            papel_bruto = (
                await sessao.execute(
                    select(MembroTarefaModelo.papel).where(
                        MembroTarefaModelo.tarefa_raiz_id == raiz_id,
                        MembroTarefaModelo.usuario_id == usuario_solicitante_id,
                    )
                )
            ).scalar_one_or_none()
            papel = cast(PapelGrupo, papel_bruto) if papel_bruto is not None else None

            if not compartilhada:
                if dono_id != usuario_solicitante_id:
                    return None
                return ContextoGrupoDaTarefa(
                    tarefa_raiz_id=raiz_id,
                    titulo_raiz=titulo_raiz,
                    dono_arvore_id=dono_id,
                    compartilhada=False,
                    meu_papel=None,
                    nos_arvore=(),
                )

            if papel is None:
                return None

            ids_arvore = await _coletar_ids_arvore(sessao, raiz_id)
            modelos = (
                (
                    await sessao.execute(
                        select(TarefaModelo)
                        .where(TarefaModelo.id.in_(ids_arvore))
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
            nos_hidratados = await hidratar_tarefas_lista(
                sessao,
                usuario_solicitante_id,
                modelos,
            )
            return ContextoGrupoDaTarefa(
                tarefa_raiz_id=raiz_id,
                titulo_raiz=titulo_raiz,
                dono_arvore_id=dono_id,
                compartilhada=True,
                meu_papel=papel,
                nos_arvore=tuple(nos_hidratados),
            )

    async def compartilhar_tarefa(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> ConviteGrupoRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = await sessao.get(TarefaModelo, tarefa_raiz_id)
            if modelo is None:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa nao encontrada.",
                    status_http=404,
                )

            if modelo.usuario_id != usuario_id:
                membro = (
                    await sessao.execute(
                        select(MembroTarefaModelo).where(
                            MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                            MembroTarefaModelo.usuario_id == usuario_id,
                        )
                    )
                ).scalar_one_or_none()
                if membro is not None:
                    raise ErroDeDominio(
                        codigo="PERMISSAO_GRUPO_INSUFICIENTE",
                        mensagem="Apenas o lider pode gerenciar o compartilhamento.",
                        status_http=403,
                    )
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa nao encontrada.",
                    status_http=404,
                )

            if modelo.tarefa_pai_id is not None:
                raise ErroDeDominio(
                    codigo="VALIDACAO_INVALIDA",
                    mensagem="Apenas uma tarefa-raiz pode ser compartilhada em conjunto.",
                    status_http=422,
                )

            ids_arvore = await _coletar_ids_arvore(sessao, tarefa_raiz_id)
            agora = datetime.now(UTC)
            await sessao.execute(
                update(TarefaModelo)
                .where(TarefaModelo.id.in_(ids_arvore))
                .values(compartilhada=True, atualizado_em=agora)
            )

            membro_lider = (
                await sessao.execute(
                    select(MembroTarefaModelo).where(
                        MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                        MembroTarefaModelo.usuario_id == usuario_id,
                    )
                )
            ).scalar_one_or_none()
            if membro_lider is None:
                sessao.add(
                    MembroTarefaModelo(
                        id=uuid4(),
                        tarefa_raiz_id=tarefa_raiz_id,
                        usuario_id=usuario_id,
                        papel="lider",
                        entrou_em=agora,
                    )
                )

            convite = (
                await sessao.execute(
                    select(ConviteTarefaModelo).where(
                        ConviteTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                        ConviteTarefaModelo.ativo.is_(True),
                    )
                )
            ).scalar_one_or_none()
            if convite is None:
                convite = ConviteTarefaModelo(
                    id=uuid4(),
                    tarefa_raiz_id=tarefa_raiz_id,
                    codigo_token=secrets.token_urlsafe(24),
                    criado_por_usuario_id=usuario_id,
                    ativo=True,
                    expira_em=None,
                    criado_em=agora,
                    revogado_em=None,
                )
                sessao.add(convite)

            await sessao.commit()
            await sessao.refresh(convite)
            return _para_convite_registro(convite)

    async def listar_membros(self, tarefa_raiz_id: UUID) -> list[MembroGrupoRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            return await _listar_membros_sessao(sessao, tarefa_raiz_id)

    async def listar_vagas(self, tarefa_raiz_id: UUID) -> list[VagaGrupoRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            modelos = (
                (
                    await sessao.execute(
                        select(VagaTarefaModelo)
                        .where(VagaTarefaModelo.tarefa_raiz_id == tarefa_raiz_id)
                        .order_by(VagaTarefaModelo.criada_em.asc())
                    )
                )
                .scalars()
                .all()
            )
            return [_para_vaga_registro(m) for m in modelos]

    async def obter_convite_ativo_da_raiz(
        self,
        tarefa_raiz_id: UUID,
    ) -> ConviteGrupoRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            agora = datetime.now(UTC)
            modelo = (
                await sessao.execute(
                    select(ConviteTarefaModelo).where(
                        ConviteTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                        ConviteTarefaModelo.ativo.is_(True),
                        or_(
                            ConviteTarefaModelo.expira_em.is_(None),
                            ConviteTarefaModelo.expira_em > agora,
                        ),
                    )
                )
            ).scalar_one_or_none()
            return _para_convite_registro(modelo) if modelo is not None else None

    async def criar_vaga(
        self,
        tarefa_raiz_id: UUID,
        *,
        nome_exibicao: str,
        email_opcional: str | None,
    ) -> VagaGrupoRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            total = (
                await sessao.execute(
                    select(func.count())
                    .select_from(VagaTarefaModelo)
                    .where(VagaTarefaModelo.tarefa_raiz_id == tarefa_raiz_id)
                )
            ).scalar_one()
            validar_limite_vagas(int(total))

            nova = VagaTarefaModelo(
                id=uuid4(),
                tarefa_raiz_id=tarefa_raiz_id,
                nome_exibicao=nome_exibicao,
                email_opcional=email_opcional,
                ocupada_por_usuario_id=None,
                criada_em=datetime.now(UTC),
            )
            sessao.add(nova)
            await sessao.commit()
            await sessao.refresh(nova)
            return _para_vaga_registro(nova)

    async def excluir_vaga(
        self,
        tarefa_raiz_id: UUID,
        vaga_id: UUID,
    ) -> bool:
        async with self._fabrica.obter_sessao() as sessao:
            await sessao.execute(
                update(TarefaModelo)
                .where(TarefaModelo.vaga_responsavel_id == vaga_id)
                .values(vaga_responsavel_id=None, atualizado_em=datetime.now(UTC))
            )
            removidas = (
                (
                    await sessao.execute(
                        delete(VagaTarefaModelo)
                        .where(
                            VagaTarefaModelo.id == vaga_id,
                            VagaTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                        )
                        .returning(VagaTarefaModelo.id)
                    )
                )
                .scalars()
                .all()
            )
            await sessao.commit()
            return len(removidas) > 0

    async def regenerar_convite(
        self,
        tarefa_raiz_id: UUID,
        criado_por_usuario_id: UUID,
    ) -> ConviteGrupoRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            agora = datetime.now(UTC)
            await sessao.execute(
                update(ConviteTarefaModelo)
                .where(
                    ConviteTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                    ConviteTarefaModelo.ativo.is_(True),
                )
                .values(ativo=False, revogado_em=agora)
            )
            novo = ConviteTarefaModelo(
                id=uuid4(),
                tarefa_raiz_id=tarefa_raiz_id,
                codigo_token=secrets.token_urlsafe(24),
                criado_por_usuario_id=criado_por_usuario_id,
                ativo=True,
                expira_em=None,
                criado_em=agora,
                revogado_em=None,
            )
            sessao.add(novo)
            await sessao.commit()
            await sessao.refresh(novo)
            return _para_convite_registro(novo)

    async def revogar_convites(self, tarefa_raiz_id: UUID) -> int:
        async with self._fabrica.obter_sessao() as sessao:
            agora = datetime.now(UTC)
            revogados = (
                (
                    await sessao.execute(
                        update(ConviteTarefaModelo)
                        .where(
                            ConviteTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                            ConviteTarefaModelo.ativo.is_(True),
                        )
                        .values(ativo=False, revogado_em=agora)
                        .returning(ConviteTarefaModelo.id)
                    )
                )
                .scalars()
                .all()
            )
            await sessao.commit()
            return len(revogados)

    async def obter_previa_convite(
        self,
        codigo_token: str,
        usuario_solicitante_id: UUID,
    ) -> PreviaConviteRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            convite = await _buscar_convite_valido(sessao, codigo_token, datetime.now(UTC))
            raiz = await sessao.get(TarefaModelo, convite.tarefa_raiz_id)
            if raiz is None or not raiz.compartilhada:
                raise ErroDeDominio(
                    codigo="CONVITE_INVALIDO_OU_REVOGADO",
                    mensagem="Projeto compartilhado nao encontrado.",
                    status_http=404,
                )

            membros = await _listar_membros_sessao(sessao, raiz.id)
            vagas_mod = (
                (
                    await sessao.execute(
                        select(VagaTarefaModelo)
                        .where(VagaTarefaModelo.tarefa_raiz_id == raiz.id)
                        .order_by(VagaTarefaModelo.criada_em.asc())
                    )
                )
                .scalars()
                .all()
            )
            vagas = tuple(_para_vaga_registro(v) for v in vagas_mod)
            lider_nome = next((m.nome_exibicao for m in membros if m.papel == "lider"), "Lider")
            ja_membro = any(m.usuario_id == usuario_solicitante_id for m in membros)
            return PreviaConviteRegistro(
                tarefa_raiz_id=raiz.id,
                titulo=raiz.titulo,
                lider_nome=lider_nome,
                membros=tuple(membros),
                vagas=vagas,
                ja_e_membro=ja_membro,
            )

    async def entrar_por_convite(
        self,
        *,
        codigo_token: str,
        usuario_id: UUID,
        email_usuario: str,
        vaga_id_solicitada: UUID | None,
    ) -> ResultadoEntradaGrupoRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            agora = datetime.now(UTC)
            convite = await _buscar_convite_valido(sessao, codigo_token, agora)
            raiz = await sessao.get(TarefaModelo, convite.tarefa_raiz_id)
            if raiz is None or not raiz.compartilhada:
                raise ErroDeDominio(
                    codigo="CONVITE_INVALIDO_OU_REVOGADO",
                    mensagem="Link de convite invalido ou projeto indisponivel.",
                    status_http=404,
                )

            existente = (
                await sessao.execute(
                    select(MembroTarefaModelo).where(
                        MembroTarefaModelo.tarefa_raiz_id == raiz.id,
                        MembroTarefaModelo.usuario_id == usuario_id,
                    )
                )
            ).scalar_one_or_none()
            if existente is not None:
                return ResultadoEntradaGrupoRegistro(
                    tarefa_raiz_id=raiz.id,
                    dono_arvore_id=raiz.usuario_id,
                    papel=cast(PapelGrupo, existente.papel),
                    vaga_vinculada_id=None,
                    subtarefas_herdadas=0,
                    ja_era_membro=True,
                )

            total_membros = (
                await sessao.execute(
                    select(func.count())
                    .select_from(MembroTarefaModelo)
                    .where(MembroTarefaModelo.tarefa_raiz_id == raiz.id)
                )
            ).scalar_one()
            validar_limite_membros(int(total_membros))

            vagas_mod = (
                (
                    await sessao.execute(
                        select(VagaTarefaModelo)
                        .where(VagaTarefaModelo.tarefa_raiz_id == raiz.id)
                        .order_by(VagaTarefaModelo.criada_em.asc())
                    )
                )
                .scalars()
                .all()
            )
            vagas_info = [
                VagaGrupoInfo(
                    id=v.id,
                    nome_exibicao=v.nome_exibicao,
                    email_opcional=v.email_opcional,
                    ocupada_por_usuario_id=v.ocupada_por_usuario_id,
                )
                for v in vagas_mod
            ]
            vaga_id = resolver_vaga_na_entrada(
                vagas_info,
                email_usuario=email_usuario,
                vaga_id_solicitada=vaga_id_solicitada,
            )

            sessao.add(
                MembroTarefaModelo(
                    id=uuid4(),
                    tarefa_raiz_id=raiz.id,
                    usuario_id=usuario_id,
                    papel="colaborador",
                    entrou_em=agora,
                )
            )

            herdadas = 0
            if vaga_id is not None:
                ocupada = (
                    (
                        await sessao.execute(
                            update(VagaTarefaModelo)
                            .where(
                                VagaTarefaModelo.id == vaga_id,
                                VagaTarefaModelo.ocupada_por_usuario_id.is_(None),
                            )
                            .values(ocupada_por_usuario_id=usuario_id)
                            .returning(VagaTarefaModelo.id)
                        )
                    )
                    .scalars()
                    .all()
                )
                if not ocupada:
                    await sessao.rollback()
                    raise ErroDeDominio(
                        codigo="VAGA_JA_OCUPADA",
                        mensagem="Esta vaga ja foi vinculada a outro participante.",
                        status_http=409,
                    )

                ids_arvore = await _coletar_ids_arvore(sessao, raiz.id)
                migradas = (
                    (
                        await sessao.execute(
                            update(TarefaModelo)
                            .where(
                                TarefaModelo.id.in_(ids_arvore),
                                TarefaModelo.vaga_responsavel_id == vaga_id,
                            )
                            .values(
                                responsavel_usuario_id=usuario_id,
                                vaga_responsavel_id=None,
                                atualizado_em=agora,
                            )
                            .returning(TarefaModelo.id)
                        )
                    )
                    .scalars()
                    .all()
                )
                herdadas = len(migradas)

            await sessao.commit()
            return ResultadoEntradaGrupoRegistro(
                tarefa_raiz_id=raiz.id,
                dono_arvore_id=raiz.usuario_id,
                papel="colaborador",
                vaga_vinculada_id=vaga_id,
                subtarefas_herdadas=herdadas,
                ja_era_membro=False,
            )

    async def atribuir_responsavel_subtarefa(
        self,
        *,
        tarefa_raiz_id: UUID,
        dono_arvore_id: UUID,
        tarefa_id: UUID,
        responsavel_usuario_id: UUID | None,
        vaga_responsavel_id: UUID | None,
    ) -> TarefaRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            ids_arvore = await _coletar_ids_arvore(sessao, tarefa_raiz_id)
            if tarefa_id not in ids_arvore:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa nao pertence ao projeto compartilhado.",
                    status_http=404,
                )

            if responsavel_usuario_id is not None:
                membro = (
                    await sessao.execute(
                        select(MembroTarefaModelo).where(
                            MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                            MembroTarefaModelo.usuario_id == responsavel_usuario_id,
                        )
                    )
                ).scalar_one_or_none()
                if membro is None:
                    raise ErroDeDominio(
                        codigo="RECURSO_NAO_ENCONTRADO",
                        mensagem="Participante informado nao faz parte deste grupo.",
                        status_http=404,
                    )

            if vaga_responsavel_id is not None:
                vaga = (
                    await sessao.execute(
                        select(VagaTarefaModelo).where(
                            VagaTarefaModelo.id == vaga_responsavel_id,
                            VagaTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                        )
                    )
                ).scalar_one_or_none()
                if vaga is None:
                    raise ErroDeDominio(
                        codigo="RECURSO_NAO_ENCONTRADO",
                        mensagem="Vaga informada nao existe neste grupo.",
                        status_http=404,
                    )
                if vaga.ocupada_por_usuario_id is not None:
                    raise ErroDeDominio(
                        codigo="VAGA_JA_OCUPADA",
                        mensagem="Esta vaga ja esta vinculada; atribua ao participante.",
                        status_http=409,
                    )

            modelo = await sessao.get(TarefaModelo, tarefa_id)
            if modelo is None:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa nao encontrada.",
                    status_http=404,
                )
            modelo.responsavel_usuario_id = responsavel_usuario_id
            modelo.vaga_responsavel_id = vaga_responsavel_id
            modelo.atualizado_em = datetime.now(UTC)
            await sessao.commit()
            await sessao.refresh(modelo)
            return (await hidratar_tarefas_lista(sessao, dono_arvore_id, [modelo]))[0]

    async def transferir_lideranca(
        self,
        *,
        tarefa_raiz_id: UUID,
        lider_atual_id: UUID,
        novo_lider_id: UUID,
    ) -> list[UUID]:
        if lider_atual_id == novo_lider_id:
            return []
        async with self._fabrica.obter_sessao() as sessao:
            membro_novo = (
                await sessao.execute(
                    select(MembroTarefaModelo).where(
                        MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                        MembroTarefaModelo.usuario_id == novo_lider_id,
                    )
                )
            ).scalar_one_or_none()
            if membro_novo is None:
                raise ErroDeDominio(
                    codigo="RECURSO_NAO_ENCONTRADO",
                    mensagem="O novo lider precisa ja ser integrante ativo do grupo.",
                    status_http=404,
                )

            # Rebaixa o lider atual e faz flush antes de promover por causa do indice parcial unico.
            await sessao.execute(
                update(MembroTarefaModelo)
                .where(
                    MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                    MembroTarefaModelo.usuario_id == lider_atual_id,
                )
                .values(papel="colaborador")
            )
            await sessao.flush()

            await sessao.execute(
                update(MembroTarefaModelo)
                .where(
                    MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                    MembroTarefaModelo.usuario_id == novo_lider_id,
                )
                .values(papel="lider")
            )

            ids_arvore = await _coletar_ids_arvore(sessao, tarefa_raiz_id)
            agora = datetime.now(UTC)
            await sessao.execute(
                update(TarefaModelo)
                .where(TarefaModelo.id.in_(ids_arvore))
                .values(usuario_id=novo_lider_id, atualizado_em=agora)
            )
            await sessao.execute(
                update(ConviteTarefaModelo)
                .where(ConviteTarefaModelo.tarefa_raiz_id == tarefa_raiz_id)
                .values(criado_por_usuario_id=novo_lider_id)
            )
            await sessao.commit()
            return ids_arvore

    async def remover_ou_sair_membro(
        self,
        *,
        tarefa_raiz_id: UUID,
        usuario_alvo_id: UUID,
    ) -> ResultadoSaidaGrupoRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            raiz = await sessao.get(TarefaModelo, tarefa_raiz_id)
            if raiz is None:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Projeto compartilhado nao encontrado.",
                    status_http=404,
                )

            membros = (
                (
                    await sessao.execute(
                        select(MembroTarefaModelo).where(
                            MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            alvo = next((m for m in membros if m.usuario_id == usuario_alvo_id), None)
            if alvo is None:
                raise ErroDeDominio(
                    codigo="RECURSO_NAO_ENCONTRADO",
                    mensagem="Usuario nao participa deste grupo.",
                    status_http=404,
                )

            ids_arvore = await _coletar_ids_arvore(sessao, tarefa_raiz_id)
            agora = datetime.now(UTC)

            if len(membros) == 1 and alvo.papel == "lider":
                desvinc = (
                    (
                        await sessao.execute(
                            update(TarefaModelo)
                            .where(TarefaModelo.id.in_(ids_arvore))
                            .values(
                                compartilhada=False,
                                responsavel_usuario_id=None,
                                vaga_responsavel_id=None,
                                atualizado_em=agora,
                            )
                            .returning(TarefaModelo.id)
                        )
                    )
                    .scalars()
                    .all()
                )
                await sessao.execute(
                    delete(ConviteTarefaModelo).where(
                        ConviteTarefaModelo.tarefa_raiz_id == tarefa_raiz_id
                    )
                )
                await sessao.execute(
                    delete(VagaTarefaModelo).where(
                        VagaTarefaModelo.tarefa_raiz_id == tarefa_raiz_id
                    )
                )
                await sessao.execute(
                    delete(MembroTarefaModelo).where(
                        MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id
                    )
                )
                await sessao.commit()
                return ResultadoSaidaGrupoRegistro(
                    dono_arvore_id=raiz.usuario_id,
                    subtarefas_desvinculadas=len(desvinc),
                    grupo_desfeito=True,
                )

            limpas = (
                (
                    await sessao.execute(
                        update(TarefaModelo)
                        .where(
                            TarefaModelo.id.in_(ids_arvore),
                            TarefaModelo.responsavel_usuario_id == usuario_alvo_id,
                        )
                        .values(responsavel_usuario_id=None, atualizado_em=agora)
                        .returning(TarefaModelo.id)
                    )
                )
                .scalars()
                .all()
            )
            await sessao.execute(
                update(VagaTarefaModelo)
                .where(
                    VagaTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                    VagaTarefaModelo.ocupada_por_usuario_id == usuario_alvo_id,
                )
                .values(ocupada_por_usuario_id=None)
            )
            await sessao.execute(
                delete(MembroTarefaModelo).where(
                    MembroTarefaModelo.tarefa_raiz_id == tarefa_raiz_id,
                    MembroTarefaModelo.usuario_id == usuario_alvo_id,
                )
            )
            await sessao.commit()
            return ResultadoSaidaGrupoRegistro(
                dono_arvore_id=raiz.usuario_id,
                subtarefas_desvinculadas=len(limpas),
                grupo_desfeito=False,
            )
