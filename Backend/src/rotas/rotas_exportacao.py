import json
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from dominio.calendario import FUSO_PADRAO
from rotas.dependencias_autenticacao import (
    exigir_workspace_liberado,
    obter_servico_estatisticas,
    obter_servico_tarefas,
)
from rotas.esquemas_autenticacao import formatar_instante_iso_utc
from rotas.esquemas_estatisticas import montar_evento_diario_resposta
from rotas.esquemas_tarefas import montar_tarefa_resposta
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_estatisticas import ServicoEstatisticas
from servicos.servico_tarefas import ServicoTarefas

roteador_exportacao = APIRouter(prefix="/api/exportacao", tags=["Exportacao"])


@roteador_exportacao.get(
    "/tarefas",
    summary="Exportar arvore de tarefas e notas ricas em Markdown ou JSON",
)
async def exportar_tarefas_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
    formato: Annotated[Literal["md", "json"], Query()] = "json",
    tarefa_id: Annotated[UUID | None, Query()] = None,
) -> Response:
    conteudo_md, detalhes, lista = await servico.exportar_tarefas(
        contexto.usuario.id,
        formato=formato,
        tarefa_id=tarefa_id,
    )
    if formato == "md":
        return Response(
            content=conteudo_md,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="lume-tarefas.md"'},
        )

    carga = {
        "exportado_em": formatar_instante_iso_utc(datetime.now(UTC)),
        "itens": [montar_tarefa_resposta(item).model_dump(mode="json") for item in lista.itens],
        "detalhes_por_tarefa": {str(chave): dict(valor) for chave, valor in detalhes.items()},
    }
    return Response(
        content=json.dumps(carga, ensure_ascii=False, indent=2),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="lume-tarefas.json"'},
    )


@roteador_exportacao.get(
    "/diario",
    summary="Exportar eventos ricos do diario do ciclo em Markdown ou JSON",
)
async def exportar_diario_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoEstatisticas, Depends(obter_servico_estatisticas)],
    formato: Annotated[Literal["md", "json"], Query()] = "json",
    de: Annotated[str | None, Query()] = None,
    ate: Annotated[str | None, Query()] = None,
    fuso_horario: Annotated[str, Query()] = FUSO_PADRAO,
) -> Response:
    conteudo_md, eventos = await servico.exportar_diario(
        contexto.usuario.id,
        formato=formato,
        de=de,
        ate=ate,
        fuso_horario=fuso_horario,
    )
    if formato == "md":
        return Response(
            content=conteudo_md,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="lume-diario.md"'},
        )

    carga = {
        "exportado_em": formatar_instante_iso_utc(datetime.now(UTC)),
        "total": len(eventos),
        "itens": [montar_evento_diario_resposta(item).model_dump(mode="json") for item in eventos],
    }
    return Response(
        content=json.dumps(carga, ensure_ascii=False, indent=2),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="lume-diario.json"'},
    )
