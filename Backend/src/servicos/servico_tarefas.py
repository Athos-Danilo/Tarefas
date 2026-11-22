import logging
from collections.abc import Iterable
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from pymongo.errors import PyMongoError

from contratos.tarefas import (
    ArmazenamentoDesfazerCascata,
    DetalhesTarefaDocumento,
    EventoCicloRegistro,
    LembreteResumo,
    RepositorioDetalhesTarefas,
    RepositorioEtiquetas,
    RepositorioEventosCiclo,
    RepositorioTarefas,
    TarefaRegistro,
)
from dominio.arvore_tarefas import (
    calcular_metricas_arvore,
    concluir_tarefa,
    desfazer_conclusao_cascata,
    mover_tarefa,
    planejar_exclusao_tarefa,
    reabrir_tarefa,
    validar_criacao_no,
)
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import (
    MAX_TAREFAS_ATIVAS_USUARIO,
    ConfiguracaoRecorrencia,
    EstrategiaExclusao,
    MetricasNoTarefa,
    NoTarefa,
    PrioridadeTarefa,
    StatusTarefa,
    TurnoTarefa,
    validar_titulo_tarefa,
)
from dominio.notas_e_etiquetas import (
    criar_detalhes_tarefa_padrao,
    renderizar_arvore_markdown,
    validar_detalhes_tarefa,
    validar_etiquetas_da_tarefa,
)
from dominio.recorrencia import (
    criar_especificacao_proxima_ocorrencia,
    validar_configuracao_recorrencia,
)

logger = logging.getLogger(__name__)

FormatoListagem = Literal["arvore", "plano"]


def _momento_do_dia(instante: datetime) -> str:
    hora = instante.astimezone(UTC).hour
    if 5 <= hora < 12:
        return "manha"
    if 12 <= hora < 17:
        return "tarde"
    if 17 <= hora < 19:
        return "crepusculo"
    return "noite"


def _encontrar_raiz_id(mapa: dict[UUID, TarefaRegistro], tarefa_id: UUID) -> UUID:
    atual_id = tarefa_id
    visitados: set[UUID] = set()
    while atual_id in mapa and atual_id not in visitados:
        visitados.add(atual_id)
        pai = mapa[atual_id].tarefa_pai_id
        if pai is None or pai not in mapa:
            return atual_id
        atual_id = pai
    return tarefa_id


def _no_mudou(antes: NoTarefa, depois: NoTarefa) -> bool:
    return (
        antes.tarefa_pai_id != depois.tarefa_pai_id
        or antes.profundidade != depois.profundidade
        or antes.status != depois.status
        or antes.vezes_reaberta != depois.vezes_reaberta
        or antes.concluida_em != depois.concluida_em
    )


def _nos_alterados(
    originais: dict[UUID, NoTarefa],
    atualizados: Iterable[NoTarefa],
) -> list[NoTarefa]:
    modificados: list[NoTarefa] = []
    for no in atualizados:
        anterior = originais.get(no.id)
        if anterior is None or _no_mudou(anterior, no):
            modificados.append(no)
    return modificados


def _formatar_data_iso(instante: datetime) -> str:
    return instante.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class NoTarefaExpandido:
    """No completo da arvore com metricas derivadas e subtarefas aninhadas."""

    registro: TarefaRegistro
    metricas: MetricasNoTarefa
    subtarefas: tuple["NoTarefaExpandido", ...]


@dataclass(frozen=True)
class RespostaListaTarefasServico:
    """Lista hierarquica ou plana com contadores globais da conta."""

    itens: tuple[NoTarefaExpandido, ...]
    ativas: int
    concluidas: int
    limite_ativas: int = MAX_TAREFAS_ATIVAS_USUARIO


@dataclass(frozen=True)
class ResultadoCriarTarefaServico:
    """Tarefa recem-criada e ancestrais afetados em caso de reabertura."""

    tarefa: NoTarefaExpandido
    ancestrais_atualizados: tuple[NoTarefaExpandido, ...]


@dataclass(frozen=True)
class DetalhesCompletosTarefaServico:
    """Visao consolidada (PostgreSQL + MongoDB) de uma tarefa e sua subarvore."""

    tarefa: NoTarefaExpandido
    detalhes: DetalhesTarefaDocumento
    lembretes: tuple[LembreteResumo, ...]


@dataclass(frozen=True)
class ResultadoConcluirServico:
    """Resultado da conclusao com token de desfazer e eventual proxima ocorrencia."""

    tarefa_id: UUID
    nos_concluidos: tuple[UUID, ...]
    ancestrais_atualizados: tuple[UUID, ...]
    token_desfazer: str | None
    expira_em: datetime | None
    proxima_ocorrencia: TarefaRegistro | None


@dataclass(frozen=True)
class ResultadoDesfazerServico:
    """Resultado da restauracao em lote dentro da janela de desfazer."""

    restaurados: int
    tarefa_id: UUID


@dataclass(frozen=True)
class ResultadoReabrirServico:
    """Resultado da reabertura ascendente com nos afetados."""

    tarefa_id: UUID
    status: StatusTarefa
    nos_reabertos: tuple[UUID, ...]
    ancestrais_reabertos: tuple[UUID, ...]


@dataclass(frozen=True)
class ResultadoMoverServico:
    """Resultado de movimentacao ou promocao a raiz."""

    tarefa: NoTarefaExpandido
    ancestrais_concluidos: tuple[UUID, ...]
    ancestrais_reabertos: tuple[UUID, ...]


@dataclass(frozen=True)
class ResultadoExclusaoServico:
    """Resumo da exclusao segura aplicada na arvore."""

    estrategia_aplicada: EstrategiaExclusao
    tarefas_removidas: int
    filhas_promovidas: int


class ServicoTarefas:
    """Orquestrador poliglota para arvore de tarefas, recorrencia, notas e consistencia."""

    def __init__(
        self,
        *,
        repositorio_tarefas: RepositorioTarefas,
        repositorio_etiquetas: RepositorioEtiquetas,
        repositorio_detalhes: RepositorioDetalhesTarefas | None,
        repositorio_eventos: RepositorioEventosCiclo | None,
        armazenamento_desfazer: ArmazenamentoDesfazerCascata,
    ) -> None:
        self._tarefas = repositorio_tarefas
        self._etiquetas = repositorio_etiquetas
        self._detalhes = repositorio_detalhes
        self._eventos = repositorio_eventos
        self._desfazer = armazenamento_desfazer

    async def _registrar_evento_seguro(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID | None,
        tarefa_raiz_id: UUID | None,
        tipo_evento: str,
        resumo: str,
        detalhes: dict[str, Any] | None = None,
    ) -> None:
        if self._eventos is None:
            return
        agora = datetime.now(UTC)
        evento = EventoCicloRegistro(
            usuario_id=str(usuario_id),
            autor_usuario_id=str(usuario_id),
            tarefa_id=str(tarefa_id) if tarefa_id else None,
            tarefa_raiz_id=str(tarefa_raiz_id) if tarefa_raiz_id else None,
            tipo_evento=tipo_evento,
            momento_do_dia=_momento_do_dia(agora),
            resumo=resumo,
            detalhes=detalhes or {},
            criado_em=agora,
        )
        try:
            await self._eventos.registrar(evento)
        except (PyMongoError, OSError, TimeoutError) as falha:
            logger.warning("Falha nao critica ao gravar evento_ciclo no MongoDB: %s", falha)

    async def _obter_detalhes_seguro(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> DetalhesTarefaDocumento:
        padrao = criar_detalhes_tarefa_padrao(str(usuario_id), str(tarefa_id))
        doc_padrao = DetalhesTarefaDocumento(
            tarefa_id=str(padrao["tarefa_id"]),
            usuario_id=str(padrao["usuario_id"]),
            metadados_visuais=dict(padrao["metadados_visuais"]),
            notas_em_blocos=list(padrao["notas_em_blocos"]),
            atualizado_em=padrao["atualizado_em"],
        )
        if self._detalhes is None:
            return doc_padrao
        try:
            return await self._detalhes.obter_ou_padrao(str(usuario_id), str(tarefa_id))
        except (PyMongoError, OSError, TimeoutError) as falha:
            logger.warning("Degradacao segura ao ler detalhes_tarefas no MongoDB: %s", falha)
            return doc_padrao

    async def _obter_varios_detalhes_seguro(
        self,
        usuario_id: UUID,
        tarefa_ids: list[UUID],
    ) -> dict[UUID, DetalhesTarefaDocumento]:
        if self._detalhes is None or not tarefa_ids:
            return {}
        try:
            brutos = await self._detalhes.obter_varios(
                str(usuario_id),
                [str(tid) for tid in tarefa_ids],
            )
            return {UUID(chave): valor for chave, valor in brutos.items()}
        except (PyMongoError, OSError, TimeoutError) as falha:
            logger.warning("Degradacao segura ao ler lote de detalhes no MongoDB: %s", falha)
            return {}

    async def _validar_etiquetas_existentes(
        self,
        usuario_id: UUID,
        etiqueta_ids: list[UUID],
    ) -> tuple[UUID, ...]:
        unicas = validar_etiquetas_da_tarefa(etiqueta_ids)
        if not unicas:
            return ()
        encontradas = await self._etiquetas.buscar_por_ids(usuario_id, unicas)
        if len(encontradas) != len(unicas):
            raise ErroDeDominio(
                codigo="RECURSO_NAO_ENCONTRADO",
                mensagem="Uma ou mais etiquetas informadas nao foram encontradas.",
                status_http=404,
            )
        return unicas

    def _montar_arvore_expandida(
        self,
        registros: list[TarefaRegistro],
        metricas: dict[UUID, MetricasNoTarefa],
        visiveis: set[UUID],
        raiz_pai: UUID | None = None,
    ) -> tuple[NoTarefaExpandido, ...]:
        por_pai: dict[UUID | None, list[TarefaRegistro]] = {}
        ids_visiveis = {r.id for r in registros if r.id in visiveis}
        for reg in registros:
            if reg.id not in ids_visiveis:
                continue
            chave = reg.tarefa_pai_id if reg.tarefa_pai_id in ids_visiveis else None
            por_pai.setdefault(chave, []).append(reg)

        def _construir(no_reg: TarefaRegistro) -> NoTarefaExpandido:
            filhas = tuple(_construir(f) for f in por_pai.get(no_reg.id, []))
            return NoTarefaExpandido(
                registro=no_reg,
                metricas=metricas[no_reg.id],
                subtarefas=filhas,
            )

        chave_inicial = raiz_pai if raiz_pai in ids_visiveis else None
        return tuple(_construir(item) for item in por_pai.get(chave_inicial, []))

    async def listar_tarefas(
        self,
        usuario_id: UUID,
        *,
        turno: TurnoTarefa | None = None,
        status: StatusTarefa | None = None,
        prioridade: PrioridadeTarefa | None = None,
        etiqueta_id: UUID | None = None,
        busca: str | None = None,
        incluir_concluidas: bool = True,
        formato: FormatoListagem = "arvore",
    ) -> RespostaListaTarefasServico:
        todos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        ativas = sum(1 for item in todos if item.status != "concluida")
        concluidas = len(todos) - ativas
        if not todos:
            return RespostaListaTarefasServico(itens=(), ativas=0, concluidas=0)

        metricas = calcular_metricas_arvore([item.para_no_tarefa() for item in todos])
        mapa = {item.id: item for item in todos}
        termo = busca.strip().lower() if busca else ""

        def _bate(reg: TarefaRegistro) -> bool:
            if not incluir_concluidas and reg.status == "concluida":
                return False
            if turno is not None and reg.turno != turno:
                return False
            if status is not None and reg.status != status:
                return False
            if prioridade is not None and reg.prioridade != prioridade:
                return False
            if etiqueta_id is not None and all(e.id != etiqueta_id for e in reg.etiquetas):
                return False
            return not (termo and termo not in reg.titulo.lower())

        casados = [item for item in todos if _bate(item)]
        if formato == "plano":
            itens_planos = tuple(
                NoTarefaExpandido(registro=item, metricas=metricas[item.id], subtarefas=())
                for item in casados
            )
            return RespostaListaTarefasServico(
                itens=itens_planos,
                ativas=ativas,
                concluidas=concluidas,
            )

        visiveis: set[UUID] = set()
        for item in casados:
            atual: TarefaRegistro | None = item
            while atual is not None and atual.id not in visiveis:
                visiveis.add(atual.id)
                atual = mapa.get(atual.tarefa_pai_id) if atual.tarefa_pai_id else None

        arvore = self._montar_arvore_expandida(todos, metricas, visiveis)
        return RespostaListaTarefasServico(
            itens=arvore,
            ativas=ativas,
            concluidas=concluidas,
        )

    async def criar_tarefa(
        self,
        usuario_id: UUID,
        *,
        titulo: str,
        tarefa_pai_id: UUID | None = None,
        prioridade: PrioridadeTarefa = "media",
        status: StatusTarefa = "pendente",
        turno: TurnoTarefa = "livre",
        prazo: datetime | None = None,
        recorrencia: ConfiguracaoRecorrencia | None = None,
        etiqueta_ids: list[UUID] | None = None,
    ) -> ResultadoCriarTarefaServico:
        todos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        ativas = sum(1 for item in todos if item.status != "concluida")
        nos_dominio = [item.para_no_tarefa() for item in todos]

        titulo_limpo, profundidade, ancestrais_a_reabrir = validar_criacao_no(
            nos_dominio,
            titulo=titulo,
            tarefa_pai_id=tarefa_pai_id,
            total_ativas_usuario=ativas,
            total_geral_usuario=len(todos),
            status_inicial=status,
        )
        regra_rec = validar_configuracao_recorrencia(recorrencia or ConfiguracaoRecorrencia())
        serie_id = uuid4() if regra_rec.tipo != "nenhuma" else None
        etiquetas_validadas = await self._validar_etiquetas_existentes(
            usuario_id,
            etiqueta_ids or [],
        )

        criada = await self._tarefas.criar_tarefa_atomica(
            usuario_id=usuario_id,
            tarefa_pai_id=tarefa_pai_id,
            titulo=titulo_limpo,
            prioridade=prioridade,
            status=status,
            turno=turno,
            prazo=prazo,
            profundidade=profundidade,
            recorrencia=regra_rec,
            serie_recorrencia_id=serie_id,
            etiqueta_ids=etiquetas_validadas,
            ancestrais_a_reabrir=ancestrais_a_reabrir,
        )

        todos_pos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        metricas_pos = calcular_metricas_arvore([item.para_no_tarefa() for item in todos_pos])
        mapa_pos = {item.id: item for item in todos_pos}
        criada_expandida = NoTarefaExpandido(
            registro=criada,
            metricas=metricas_pos[criada.id],
            subtarefas=(),
        )
        ancestrais_exp: list[NoTarefaExpandido] = []
        pai_cursor = criada.tarefa_pai_id
        while pai_cursor is not None and pai_cursor in mapa_pos:
            pai_reg = mapa_pos[pai_cursor]
            ancestrais_exp.append(
                NoTarefaExpandido(
                    registro=pai_reg,
                    metricas=metricas_pos[pai_reg.id],
                    subtarefas=(),
                )
            )
            pai_cursor = pai_reg.tarefa_pai_id

        raiz_id = _encontrar_raiz_id(mapa_pos, criada.id)
        await self._registrar_evento_seguro(
            usuario_id=usuario_id,
            tarefa_id=criada.id,
            tarefa_raiz_id=raiz_id,
            tipo_evento="tarefa_criada",
            resumo=f"Tarefa criada: {criada.titulo}",
        )
        return ResultadoCriarTarefaServico(
            tarefa=criada_expandida,
            ancestrais_atualizados=tuple(ancestrais_exp),
        )

    async def obter_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> DetalhesCompletosTarefaServico:
        subarvore = await self._tarefas.obter_subarvore_cte(usuario_id, tarefa_id)
        if not subarvore:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )

        subarvore_sem_pai_externo = [
            replace(
                item.para_no_tarefa(),
                tarefa_pai_id=None if item.id == tarefa_id else item.tarefa_pai_id,
            )
            for item in subarvore
        ]
        metricas = calcular_metricas_arvore(subarvore_sem_pai_externo)

        por_pai: dict[UUID | None, list[TarefaRegistro]] = {}
        for item in subarvore:
            chave = None if item.id == tarefa_id else item.tarefa_pai_id
            por_pai.setdefault(chave, []).append(item)

        def _montar(reg: TarefaRegistro) -> NoTarefaExpandido:
            return NoTarefaExpandido(
                registro=reg,
                metricas=metricas[reg.id],
                subtarefas=tuple(_montar(f) for f in por_pai.get(reg.id, [])),
            )

        alvo = next(item for item in subarvore if item.id == tarefa_id)
        detalhes = await self._obter_detalhes_seguro(usuario_id, tarefa_id)
        lembretes = await self._tarefas.listar_lembretes_da_tarefa(usuario_id, tarefa_id)
        return DetalhesCompletosTarefaServico(
            tarefa=_montar(alvo),
            detalhes=detalhes,
            lembretes=tuple(lembretes),
        )

    async def atualizar_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        campos_presentes: set[str],
        titulo: str | None = None,
        prioridade: PrioridadeTarefa | None = None,
        status: StatusTarefa | None = None,
        turno: TurnoTarefa | None = None,
        prazo: datetime | None = None,
        recorrencia: ConfiguracaoRecorrencia | None = None,
        etiqueta_ids: list[UUID] | None = None,
    ) -> NoTarefaExpandido:
        atual = await self._tarefas.obter_por_id(usuario_id, tarefa_id)
        if atual is None:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )

        novo_titulo = (
            validar_titulo_tarefa(titulo)
            if "titulo" in campos_presentes and titulo is not None
            else atual.titulo
        )
        if "titulo" in campos_presentes and titulo is None:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="O titulo nao pode ser nulo.",
                status_http=422,
            )
        nova_prioridade = (
            prioridade
            if "prioridade" in campos_presentes and prioridade is not None
            else atual.prioridade
        )
        novo_turno = turno if "turno" in campos_presentes and turno is not None else atual.turno
        novo_prazo = prazo if "prazo" in campos_presentes else atual.prazo

        if "recorrencia" in campos_presentes:
            regra_base = recorrencia or ConfiguracaoRecorrencia()
            nova_recorrencia = validar_configuracao_recorrencia(regra_base)
            nova_serie = (
                atual.serie_recorrencia_id or uuid4()
                if nova_recorrencia.tipo != "nenhuma"
                else None
            )
        else:
            nova_recorrencia = atual.recorrencia
            nova_serie = atual.serie_recorrencia_id

        etiquetas_validadas: tuple[UUID, ...] | None = None
        if "etiqueta_ids" in campos_presentes:
            etiquetas_validadas = await self._validar_etiquetas_existentes(
                usuario_id,
                etiqueta_ids or [],
            )

        status_direto: StatusTarefa | None = None
        if "status" in campos_presentes and status is not None and status != atual.status:
            if status == "concluida":
                await self.concluir_tarefa(usuario_id, tarefa_id, confirmar_cascata=False)
            elif atual.status == "concluida":
                await self.reabrir_tarefa(usuario_id, tarefa_id, status_destino=status)
            else:
                status_direto = status

        await self._tarefas.atualizar_tarefa_atomica(
            usuario_id=usuario_id,
            tarefa_id=tarefa_id,
            titulo=novo_titulo,
            prioridade=nova_prioridade,
            turno=novo_turno,
            prazo=novo_prazo,
            recorrencia=nova_recorrencia,
            serie_recorrencia_id=nova_serie,
            etiqueta_ids=etiquetas_validadas,
            status=status_direto,
        )
        return (await self.obter_tarefa(usuario_id, tarefa_id)).tarefa

    async def concluir_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        confirmar_cascata: bool = False,
    ) -> ResultadoConcluirServico:
        todos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        mapa_reg = {item.id: item for item in todos}
        if tarefa_id not in mapa_reg:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )

        originais = {item.id: item.para_no_tarefa() for item in todos}
        agora = datetime.now(UTC)
        resultado = concluir_tarefa(
            list(originais.values()),
            tarefa_id,
            confirmar_cascata=confirmar_cascata,
            agora=agora,
        )
        modificados = _nos_alterados(originais, resultado.nos_atualizados)
        todos_concluidos = tuple(
            dict.fromkeys((*resultado.nos_concluidos, *resultado.ancestrais_atualizados))
        )

        alvo_reg = mapa_reg[tarefa_id]
        nova_ocorrencia = None
        etiquetas_ocorrencia: tuple[UUID, ...] = ()
        if resultado.nos_concluidos and alvo_reg.recorrencia.tipo != "nenhuma":
            nova_ocorrencia = criar_especificacao_proxima_ocorrencia(
                originais[tarefa_id],
                agora=agora,
            )
            etiquetas_ocorrencia = tuple(e.id for e in alvo_reg.etiquetas)

        proxima_criada: TarefaRegistro | None = None
        if modificados or nova_ocorrencia is not None:
            proxima_criada = await self._tarefas.aplicar_mudancas_arvore_atomica(
                usuario_id=usuario_id,
                nos_modificados=modificados,
                ids_concluidos_cancelar_lembretes=todos_concluidos,
                nova_ocorrencia=nova_ocorrencia,
                etiquetas_ocorrencia_ids=etiquetas_ocorrencia,
            )

        token_desfazer: str | None = None
        expira_em: datetime | None = None
        if resultado.registro_desfazer is not None:
            token_desfazer = self._desfazer.salvar(usuario_id, resultado.registro_desfazer)
            expira_em = resultado.registro_desfazer.expira_em

        raiz_id = _encontrar_raiz_id(mapa_reg, tarefa_id)
        tipo_evento = "cascata_concluida" if len(todos_concluidos) > 1 else "tarefa_concluida"
        await self._registrar_evento_seguro(
            usuario_id=usuario_id,
            tarefa_id=tarefa_id,
            tarefa_raiz_id=raiz_id,
            tipo_evento=tipo_evento,
            resumo=f"Tarefa concluida: {alvo_reg.titulo}",
            detalhes={"total_concluidas": len(todos_concluidos)},
        )

        return ResultadoConcluirServico(
            tarefa_id=tarefa_id,
            nos_concluidos=resultado.nos_concluidos,
            ancestrais_atualizados=resultado.ancestrais_atualizados,
            token_desfazer=token_desfazer,
            expira_em=expira_em,
            proxima_ocorrencia=proxima_criada,
        )

    async def desfazer_cascata(
        self,
        usuario_id: UUID,
        *,
        token_desfazer: str,
    ) -> ResultadoDesfazerServico:
        registro = self._desfazer.obter(usuario_id, token_desfazer)
        if registro is None:
            raise ErroDeDominio(
                codigo="DESFAZER_EXPIRADO",
                mensagem="Token de desfazer inexistente, expirado ou ja utilizado.",
                status_http=409,
            )

        todos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        originais = {item.id: item.para_no_tarefa() for item in todos}
        resultado = desfazer_conclusao_cascata(
            list(originais.values()),
            registro,
            agora=datetime.now(UTC),
        )
        modificados = _nos_alterados(originais, resultado.nos_atualizados)
        if modificados:
            await self._tarefas.aplicar_mudancas_arvore_atomica(
                usuario_id=usuario_id,
                nos_modificados=modificados,
            )
        self._desfazer.marcar_consumido(usuario_id, token_desfazer)
        return ResultadoDesfazerServico(
            restaurados=len(resultado.nos_restaurados),
            tarefa_id=registro.tarefa_raiz_acao_id,
        )

    async def reabrir_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        status_destino: StatusTarefa = "em_andamento",
    ) -> ResultadoReabrirServico:
        todos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        mapa_reg = {item.id: item for item in todos}
        if tarefa_id not in mapa_reg:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )

        originais = {item.id: item.para_no_tarefa() for item in todos}
        resultado = reabrir_tarefa(
            list(originais.values()),
            tarefa_id,
            status_destino=status_destino,
        )
        modificados = _nos_alterados(originais, resultado.nos_atualizados)
        if modificados:
            await self._tarefas.aplicar_mudancas_arvore_atomica(
                usuario_id=usuario_id,
                nos_modificados=modificados,
            )

        raiz_id = _encontrar_raiz_id(mapa_reg, tarefa_id)
        await self._registrar_evento_seguro(
            usuario_id=usuario_id,
            tarefa_id=tarefa_id,
            tarefa_raiz_id=raiz_id,
            tipo_evento="tarefa_reaberta",
            resumo=f"Tarefa reaberta: {mapa_reg[tarefa_id].titulo}",
        )
        return ResultadoReabrirServico(
            tarefa_id=tarefa_id,
            status=status_destino,
            nos_reabertos=resultado.nos_reabertos,
            ancestrais_reabertos=resultado.ancestrais_reabertos,
        )

    async def mover_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        novo_pai_id: UUID | None,
        nova_ordem: int | None = None,
    ) -> ResultadoMoverServico:
        todos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        if not any(item.id == tarefa_id for item in todos):
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )

        originais = {item.id: item.para_no_tarefa() for item in todos}
        resultado = mover_tarefa(
            list(originais.values()),
            tarefa_id,
            novo_pai_id=novo_pai_id,
            agora=datetime.now(UTC),
        )
        modificados = _nos_alterados(originais, resultado.nos_atualizados)
        if modificados:
            await self._tarefas.aplicar_mudancas_arvore_atomica(
                usuario_id=usuario_id,
                nos_modificados=modificados,
            )
        if nova_ordem is not None:
            await self._tarefas.reordenar_irmas_atomica(
                usuario_id=usuario_id,
                tarefa_pai_id=novo_pai_id,
                itens_ordenacao=[(tarefa_id, nova_ordem)],
            )

        tarefa_movida = (await self.obter_tarefa(usuario_id, tarefa_id)).tarefa
        return ResultadoMoverServico(
            tarefa=tarefa_movida,
            ancestrais_concluidos=resultado.ancestrais_concluidos,
            ancestrais_reabertos=resultado.ancestrais_reabertos,
        )

    async def reordenar_irmas(
        self,
        usuario_id: UUID,
        *,
        tarefa_pai_id: UUID | None,
        ordenacao: list[tuple[UUID, int]],
    ) -> int:
        return await self._tarefas.reordenar_irmas_atomica(
            usuario_id=usuario_id,
            tarefa_pai_id=tarefa_pai_id,
            itens_ordenacao=ordenacao,
        )

    async def excluir_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        estrategia: EstrategiaExclusao | None = None,
    ) -> ResultadoExclusaoServico:
        todos = await self._tarefas.listar_todas_do_usuario(usuario_id)
        mapa_reg = {item.id: item for item in todos}
        if tarefa_id not in mapa_reg:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )

        originais = {item.id: item.para_no_tarefa() for item in todos}
        resultado = planejar_exclusao_tarefa(
            list(originais.values()),
            tarefa_id,
            estrategia=estrategia,
            agora=datetime.now(UTC),
        )
        nos_atualizados = _nos_alterados(originais, resultado.nos_restantes)
        await self._tarefas.excluir_tarefas_atomica(
            usuario_id=usuario_id,
            nos_atualizados=nos_atualizados,
            ids_remover=resultado.ids_removidos,
        )

        if self._detalhes is not None and resultado.ids_removidos:
            ids_str = [str(rid) for rid in resultado.ids_removidos]
            raizes_str = [
                str(rid) for rid in resultado.ids_removidos if mapa_reg[rid].tarefa_pai_id is None
            ]
            try:
                await self._detalhes.remover_por_tarefas(str(usuario_id), ids_str)
                if raizes_str:
                    await self._detalhes.remover_layouts_raizes(str(usuario_id), raizes_str)
            except (PyMongoError, OSError, TimeoutError) as falha:
                logger.warning("Falha nao critica ao limpar documentos no MongoDB: %s", falha)

        return ResultadoExclusaoServico(
            estrategia_aplicada=resultado.estrategia_aplicada,
            tarefas_removidas=len(resultado.ids_removidos),
            filhas_promovidas=len(resultado.filhas_promovidas),
        )

    async def obter_detalhes(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> DetalhesTarefaDocumento:
        tarefa = await self._tarefas.obter_por_id(usuario_id, tarefa_id)
        if tarefa is None:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )
        return await self._obter_detalhes_seguro(usuario_id, tarefa_id)

    async def salvar_detalhes(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        metadados_visuais: dict[str, Any] | None,
        notas_em_blocos: list[dict[str, Any]],
    ) -> DetalhesTarefaDocumento:
        tarefa = await self._tarefas.obter_por_id(usuario_id, tarefa_id)
        if tarefa is None:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )
        validado = validar_detalhes_tarefa(
            metadados_visuais=metadados_visuais,
            notas_em_blocos=notas_em_blocos,
        )
        documento = DetalhesTarefaDocumento(
            tarefa_id=str(tarefa_id),
            usuario_id=str(usuario_id),
            metadados_visuais=validado["metadados_visuais"],
            notas_em_blocos=validado["notas_em_blocos"],
            atualizado_em=_formatar_data_iso(datetime.now(UTC)),
        )
        if self._detalhes is None:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Banco documental indisponivel para salvar notas da tarefa.",
                status_http=503,
            )
        try:
            await self._detalhes.salvar(documento)
        except (PyMongoError, OSError, TimeoutError) as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel salvar as notas da tarefa no MongoDB.",
                status_http=503,
            ) from falha
        return documento

    async def exportar_tarefas(
        self,
        usuario_id: UUID,
        *,
        formato: Literal["md", "json"],
        tarefa_id: UUID | None = None,
    ) -> tuple[str, dict[UUID, DetalhesTarefaDocumento], RespostaListaTarefasServico]:
        if tarefa_id is not None:
            registros = await self._tarefas.obter_subarvore_cte(usuario_id, tarefa_id)
            if not registros:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa nao encontrada.",
                    status_http=404,
                )
        else:
            registros = await self._tarefas.listar_todas_do_usuario(usuario_id)

        detalhes = await self._obter_varios_detalhes_seguro(
            usuario_id,
            [item.id for item in registros],
        )

        if formato == "md":
            conteudo_md = renderizar_arvore_markdown(registros, detalhes)
            return (
                conteudo_md,
                detalhes,
                RespostaListaTarefasServico(
                    itens=(),
                    ativas=0,
                    concluidas=0,
                ),
            )

        if tarefa_id is not None:
            subarvore_normalizada = [
                replace(
                    item.para_no_tarefa(),
                    tarefa_pai_id=None if item.id == tarefa_id else item.tarefa_pai_id,
                )
                for item in registros
            ]
            metricas = calcular_metricas_arvore(subarvore_normalizada)
            visiveis = {item.id for item in registros}
            itens = self._montar_arvore_expandida(registros, metricas, visiveis)
            ativas = sum(1 for item in registros if item.status != "concluida")
            lista = RespostaListaTarefasServico(
                itens=itens,
                ativas=ativas,
                concluidas=len(registros) - ativas,
            )
        else:
            lista = await self.listar_tarefas(usuario_id, formato="arvore")

        return "", detalhes, lista
