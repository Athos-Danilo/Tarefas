from typing import Protocol

from dominio.constelacoes import LayoutConstelacao


class RepositorioLayoutsConstelacao(Protocol):
    """Porta abstrata para leitura, upsert e limpeza de layouts visuais no MongoDB."""

    async def obter(self, usuario_id: str, tarefa_raiz_id: str) -> LayoutConstelacao | None:
        """Retorna o layout salvo para o par usuario e tarefa raiz, se existir."""
        ...

    async def salvar(self, layout: LayoutConstelacao) -> None:
        """Persiste ou atualiza de forma idempotente o layout do usuario para a raiz."""
        ...

    async def remover(self, usuario_id: str, tarefa_raiz_id: str) -> bool:
        """Remove o layout personalizado para restaurar o arranjo automatico."""
        ...
