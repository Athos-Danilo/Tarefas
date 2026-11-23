from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from dominio.foco import StatusSessaoFoco


@dataclass(frozen=True)
class SessaoFocoRegistro:
    """Registro persistido de sessao do Modo Foco Imersivo."""

    id: UUID
    usuario_id: UUID
    tarefa_id: UUID
    tarefa_titulo: str
    duracao_planejada_seg: int
    duracao_real_seg: int | None
    iniciada_em: datetime
    encerrada_em: datetime | None
    status: StatusSessaoFoco


class RepositorioSessoesFoco(Protocol):
    """Porta relacional PostgreSQL para ciclo de vida de sessoes de foco."""

    async def obter_ativa(self, usuario_id: UUID) -> SessaoFocoRegistro | None: ...

    async def obter_por_id(
        self,
        usuario_id: UUID,
        sessao_id: UUID,
    ) -> SessaoFocoRegistro | None: ...

    async def criar(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        duracao_planejada_seg: int,
        iniciada_em: datetime,
    ) -> SessaoFocoRegistro: ...

    async def encerrar(
        self,
        *,
        usuario_id: UUID,
        sessao_id: UUID,
        status: StatusSessaoFoco,
        duracao_real_seg: int,
        encerrada_em: datetime,
    ) -> SessaoFocoRegistro | None: ...

    async def listar_historico(
        self,
        usuario_id: UUID,
        limite: int,
    ) -> list[SessaoFocoRegistro]: ...
