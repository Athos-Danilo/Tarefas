from contextlib import AbstractAsyncContextManager
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from dominio.preferencias_padrao import PreferenciasCenario


class FabricaSessaoRelacional(Protocol):
    """Porta abstrata para abertura de sessoes e sondagem do banco relacional."""

    def obter_sessao(self) -> AbstractAsyncContextManager[AsyncSession]:
        """Retorna um gerenciador de contexto assincrono com sessao transacional."""
        ...

    async def verificar_conexao(self) -> bool:
        """Executa consulta leve para confirmar disponibilidade do banco."""
        ...

    async def fechar(self) -> None:
        """Encerra o pool de conexoes."""
        ...


class RepositorioPreferenciasCenario(Protocol):
    """Porta abstrata de leitura e gravacao de preferencias do cenario."""

    async def obter_ou_padrao(self, usuario_id: str) -> PreferenciasCenario:
        """Retorna preferencias do usuario ou o padrao seguro quando ausente."""
        ...

    async def salvar(self, preferencias: PreferenciasCenario) -> None:
        """Persiste ou atualiza de forma idempotente as preferencias do usuario."""
        ...

    async def remover_por_usuario(self, usuario_id: str) -> bool:
        """Remove definitivamente as preferencias do usuario."""
        ...
