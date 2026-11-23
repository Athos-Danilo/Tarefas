from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from dominio.push import PlataformaPush, StatusLembrete


@dataclass(frozen=True)
class InscricaoPushRegistro:
    """Registro persistido de dispositivo habilitado para Web Push VAPID."""

    id: UUID
    usuario_id: UUID
    endpoint: str
    chave_p256dh: str
    chave_auth: str
    rotulo_dispositivo: str
    plataforma: PlataformaPush
    criado_em: datetime
    ultimo_envio_em: datetime | None


@dataclass(frozen=True)
class LembreteTarefaRegistro:
    """Registro completo de lembrete vinculado a uma tarefa."""

    id: UUID
    usuario_id: UUID
    tarefa_id: UUID
    disparar_em: datetime
    antecedencia_min: int
    status: StatusLembrete
    enviado_em: datetime | None
    criado_em: datetime


@dataclass(frozen=True)
class LembretePendenteDisparo:
    """Lembrete vencido selecionado na varredura do cron com titulo da tarefa."""

    id: UUID
    usuario_id: UUID
    tarefa_id: UUID
    titulo_tarefa: str
    disparar_em: datetime
    antecedencia_min: int


@dataclass(frozen=True)
class ResultadoEnvioPush:
    """Resultado individual do envio para um endpoint Web Push."""

    sucesso: bool
    expirada: bool
    status_http: int | None = None
    detalhe: str | None = None


@dataclass(frozen=True)
class ResumoDisparoLembretes:
    """Totais consolidados retornados pelo endpoint interno de varredura cron."""

    lembretes_processados: int
    notificacoes_enviadas: int
    inscricoes_removidas_expiradas: int


class RepositorioPushELembretes(Protocol):
    """Porta PostgreSQL para inscricoes Web Push VAPID e lembretes de tarefas."""

    async def listar_inscricoes_usuario(self, usuario_id: UUID) -> list[InscricaoPushRegistro]: ...

    async def listar_inscricoes_por_usuarios(
        self, usuario_ids: Sequence[UUID]
    ) -> list[InscricaoPushRegistro]: ...

    async def obter_inscricao_por_endpoint(self, endpoint: str) -> InscricaoPushRegistro | None: ...

    async def registrar_ou_atualizar_inscricao(
        self,
        *,
        usuario_id: UUID,
        endpoint: str,
        chave_p256dh: str,
        chave_auth: str,
        rotulo_dispositivo: str,
        plataforma: PlataformaPush,
    ) -> InscricaoPushRegistro: ...

    async def revogar_inscricao(self, usuario_id: UUID, dispositivo_id: UUID) -> bool: ...

    async def remover_inscricoes_por_ids(self, inscricao_ids: Sequence[UUID]) -> int: ...

    async def atualizar_ultimo_envio_inscricoes(
        self, inscricao_ids: Sequence[UUID], instante: datetime
    ) -> None: ...

    async def verificar_acesso_tarefa(self, usuario_id: UUID, tarefa_id: UUID) -> bool: ...

    async def listar_lembretes_tarefa(
        self, usuario_id: UUID, tarefa_id: UUID
    ) -> list[LembreteTarefaRegistro]: ...

    async def contar_lembretes_pendentes_tarefa(self, usuario_id: UUID, tarefa_id: UUID) -> int: ...

    async def criar_lembrete(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        disparar_em: datetime,
        antecedencia_min: int,
    ) -> LembreteTarefaRegistro: ...

    async def atualizar_lembrete(
        self,
        *,
        usuario_id: UUID,
        lembrete_id: UUID,
        disparar_em: datetime | None,
        antecedencia_min: int | None,
    ) -> LembreteTarefaRegistro | None: ...

    async def cancelar_lembrete(self, usuario_id: UUID, lembrete_id: UUID) -> bool: ...

    async def listar_lembretes_pendentes_vencidos(
        self, agora: datetime
    ) -> list[LembretePendenteDisparo]: ...

    async def marcar_lembretes_enviados(
        self, lembrete_ids: Sequence[UUID], instante: datetime
    ) -> None: ...


class ProvedorWebPush(Protocol):
    """Porta de entrega Web Push (pywebpush real ou duble em testes)."""

    async def enviar(
        self,
        inscricao: InscricaoPushRegistro,
        payload: dict[str, Any],
    ) -> ResultadoEnvioPush: ...
