from typing import Any

from pymongo import ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

COLECAO_DETALHES_TAREFAS = "detalhes_tarefas"
COLECAO_LAYOUTS_CONSTELACAO = "layouts_constelacao"
COLECAO_EVENTOS_CICLO = "eventos_ciclo"
COLECAO_PREFERENCIAS_CENARIO = "preferencias_cenario"


async def garantir_indices_mongo(banco: AsyncDatabase[dict[str, Any]]) -> None:
    """Cria de forma idempotente os indices das quatro colecoes do MongoDB."""
    await banco[COLECAO_DETALHES_TAREFAS].create_index(
        [("tarefa_id", ASCENDING)],
        name="uq_detalhes_tarefa_id",
        unique=True,
    )
    await banco[COLECAO_DETALHES_TAREFAS].create_index(
        [("usuario_id", ASCENDING)],
        name="ix_detalhes_usuario_id",
    )

    await banco[COLECAO_LAYOUTS_CONSTELACAO].create_index(
        [("usuario_id", ASCENDING), ("tarefa_raiz_id", ASCENDING)],
        name="uq_layout_usuario_raiz",
        unique=True,
    )

    await banco[COLECAO_EVENTOS_CICLO].create_index(
        [("usuario_id", ASCENDING), ("criado_em", DESCENDING)],
        name="ix_eventos_usuario_criado_em",
    )
    await banco[COLECAO_EVENTOS_CICLO].create_index(
        [("autor_usuario_id", ASCENDING), ("criado_em", DESCENDING)],
        name="ix_eventos_autor_criado_em",
    )
    await banco[COLECAO_EVENTOS_CICLO].create_index(
        [("tarefa_raiz_id", ASCENDING), ("criado_em", DESCENDING)],
        name="ix_eventos_raiz_criado_em",
    )

    await banco[COLECAO_PREFERENCIAS_CENARIO].create_index(
        [("usuario_id", ASCENDING)],
        name="uq_preferencias_usuario_id",
        unique=True,
    )
