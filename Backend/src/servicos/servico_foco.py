import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from pymongo.errors import PyMongoError

from contratos.foco import RepositorioSessoesFoco, SessaoFocoRegistro
from contratos.grupos import RepositorioGrupos
from contratos.tarefas import EventoCicloRegistro, RepositorioEventosCiclo
from dominio.erros import ErroDeDominio
from dominio.foco import (
    StatusSessaoFoco,
    calcular_duracao_real_seg,
    normalizar_limite_historico,
    validar_duracao_planejada,
)

logger = logging.getLogger(__name__)


def _momento_utc(instante: datetime) -> str:
    hora = instante.astimezone(UTC).hour
    if 5 <= hora < 12:
        return "manha"
    if 12 <= hora < 17:
        return "tarde"
    if 17 <= hora < 19:
        return "crepusculo"
    return "noite"


@dataclass(frozen=True)
class HistoricoFocoResultado:
    """Historico recente de sessoes de foco e total concluido no recorte."""

    itens: list[SessaoFocoRegistro]
    total_segundos_concluidos: int


class ServicoFoco:
    """Casos de uso do Modo Foco Imersivo com sessao unica ativa e diario."""

    def __init__(
        self,
        repositorio_foco: RepositorioSessoesFoco,
        repositorio_grupos: RepositorioGrupos,
        repositorio_eventos: RepositorioEventosCiclo | None = None,
        relogio: Callable[[], datetime] | None = None,
    ) -> None:
        self._foco = repositorio_foco
        self._grupos = repositorio_grupos
        self._eventos = repositorio_eventos
        self._relogio = relogio or (lambda: datetime.now(UTC))

    async def obter_sessao_ativa(self, usuario_id: UUID) -> SessaoFocoRegistro | None:
        return await self._foco.obter_ativa(usuario_id)

    async def iniciar_sessao(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        duracao_planejada_seg: int,
    ) -> SessaoFocoRegistro:
        duracao_validada = validar_duracao_planejada(duracao_planejada_seg)
        contexto = await self._grupos.obter_contexto_por_tarefa(usuario_id, tarefa_id)
        if contexto is None:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada para iniciar sessao de foco.",
                status_http=404,
            )

        if await self._foco.obter_ativa(usuario_id) is not None:
            raise ErroDeDominio(
                codigo="SESSAO_FOCO_JA_ATIVA",
                mensagem="Ja existe uma sessao de foco em andamento.",
                status_http=409,
            )

        agora = self._relogio().astimezone(UTC)
        return await self._foco.criar(
            usuario_id=usuario_id,
            tarefa_id=tarefa_id,
            duracao_planejada_seg=duracao_validada,
            iniciada_em=agora,
        )

    async def concluir_sessao(
        self,
        *,
        usuario_id: UUID,
        sessao_id: UUID,
        duracao_informada_seg: int | None = None,
    ) -> SessaoFocoRegistro:
        return await self._encerrar_sessao(
            usuario_id=usuario_id,
            sessao_id=sessao_id,
            novo_status="concluida",
            duracao_informada_seg=duracao_informada_seg,
        )

    async def interromper_sessao(
        self,
        *,
        usuario_id: UUID,
        sessao_id: UUID,
        duracao_informada_seg: int | None = None,
    ) -> SessaoFocoRegistro:
        return await self._encerrar_sessao(
            usuario_id=usuario_id,
            sessao_id=sessao_id,
            novo_status="interrompida",
            duracao_informada_seg=duracao_informada_seg,
        )

    async def _encerrar_sessao(
        self,
        *,
        usuario_id: UUID,
        sessao_id: UUID,
        novo_status: StatusSessaoFoco,
        duracao_informada_seg: int | None,
    ) -> SessaoFocoRegistro:
        atual = await self._foco.obter_por_id(usuario_id, sessao_id)
        if atual is None:
            raise ErroDeDominio(
                codigo="SESSAO_FOCO_NAO_ENCONTRADA",
                mensagem="Sessao de foco nao encontrada para o usuario.",
                status_http=404,
            )
        if atual.status != "em_andamento":
            raise ErroDeDominio(
                codigo="SESSAO_FOCO_JA_ENCERRADA",
                mensagem="Esta sessao de foco ja foi encerrada.",
                status_http=409,
            )

        agora = self._relogio().astimezone(UTC)
        duracao_real = calcular_duracao_real_seg(
            iniciada_em=atual.iniciada_em,
            encerrada_em=agora,
            duracao_informada_seg=duracao_informada_seg,
        )
        encerrada = await self._foco.encerrar(
            usuario_id=usuario_id,
            sessao_id=sessao_id,
            status=novo_status,
            duracao_real_seg=duracao_real,
            encerrada_em=agora,
        )
        if encerrada is None:
            raise ErroDeDominio(
                codigo="SESSAO_FOCO_NAO_ENCONTRADA",
                mensagem="Sessao de foco nao encontrada ao encerrar.",
                status_http=404,
            )

        await self._registrar_evento_foco(
            usuario_id=usuario_id,
            sessao=encerrada,
            agora=agora,
        )
        return encerrada

    async def _registrar_evento_foco(
        self,
        *,
        usuario_id: UUID,
        sessao: SessaoFocoRegistro,
        agora: datetime,
    ) -> None:
        if self._eventos is None:
            return
        contexto = await self._grupos.obter_contexto_por_tarefa(usuario_id, sessao.tarefa_id)
        tarefa_raiz_id = str(contexto.tarefa_raiz_id) if contexto is not None else None
        tipo_evento = "foco_concluido" if sessao.status == "concluida" else "foco_interrompido"
        resumo = (
            f"Sessao de foco concluida em {sessao.tarefa_titulo}."
            if sessao.status == "concluida"
            else f"Sessao de foco interrompida em {sessao.tarefa_titulo}."
        )
        evento = EventoCicloRegistro(
            usuario_id=str(usuario_id),
            autor_usuario_id=str(usuario_id),
            tarefa_id=str(sessao.tarefa_id),
            tarefa_raiz_id=tarefa_raiz_id,
            tipo_evento=tipo_evento,
            momento_do_dia=_momento_utc(agora),
            resumo=resumo,
            detalhes={
                "sessao_id": str(sessao.id),
                "duracao_planejada_seg": sessao.duracao_planejada_seg,
                "duracao_real_seg": sessao.duracao_real_seg or 0,
                "status": sessao.status,
            },
            criado_em=agora,
        )
        try:
            await self._eventos.registrar(evento)
        except (PyMongoError, OSError, TimeoutError) as falha:
            logger.warning("Falha nao critica ao gravar evento de foco no MongoDB: %s", falha)

    async def listar_historico(
        self,
        usuario_id: UUID,
        limite: int = 20,
    ) -> HistoricoFocoResultado:
        limite_ok = normalizar_limite_historico(limite)
        itens = await self._foco.listar_historico(usuario_id, limite_ok)
        total_concluidos = sum(
            (item.duracao_real_seg or 0) for item in itens if item.status == "concluida"
        )
        return HistoricoFocoResultado(
            itens=itens,
            total_segundos_concluidos=total_concluidos,
        )
