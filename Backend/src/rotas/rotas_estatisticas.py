from typing import Annotated, Any, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from dominio.calendario import FUSO_PADRAO
from dominio.erros import ErroDeDominio
from dominio.estatisticas import EscopoEstatisticas, PeriodoEstatisticas
from rotas.dependencias_autenticacao import (
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_estatisticas,
)
from rotas.esquemas_estatisticas import (
    RequisicaoAtualizarPreferencias,
    RespostaDiarioEventos,
    RespostaEstatisticasResumo,
    RespostaPreferenciasCenario,
    montar_evento_diario_resposta,
    montar_resposta_preferencias,
    montar_resposta_resumo,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_estatisticas import ServicoEstatisticas

roteador_estatisticas = APIRouter(prefix="/api/estatisticas", tags=["Estatisticas"])
roteador_diario = APIRouter(prefix="/api/diario", tags=["Diario"])
roteador_preferencias = APIRouter(prefix="/api/preferencias", tags=["Preferencias"])

_PERIODOS_VALIDOS = {"7d", "30d", "90d", "tudo"}
_ESCOPOS_VALIDOS = {"todas", "pessoais", "grupo"}


def _normalizar_periodo(valor: str) -> PeriodoEstatisticas:
    limpo = valor.strip()
    if limpo not in _PERIODOS_VALIDOS:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Periodo informado para estatisticas e invalido.",
            status_http=422,
        )
    return cast(PeriodoEstatisticas, limpo)


def _normalizar_escopo(valor: str) -> EscopoEstatisticas:
    limpo = valor.strip()
    if limpo not in _ESCOPOS_VALIDOS:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Escopo informado para estatisticas e invalido.",
            status_http=422,
        )
    return cast(EscopoEstatisticas, limpo)


def _normalizar_etiqueta_id(valor: str | None) -> UUID | None:
    if valor is None or not valor.strip():
        return None
    try:
        return UUID(valor.strip())
    except ValueError as falha:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Identificador de etiqueta informado e invalido.",
            status_http=422,
        ) from falha


@roteador_estatisticas.get(
    "/resumo",
    response_model=RespostaEstatisticasResumo,
    summary="Consultar KPIs completos, series, mapa de calor, recorrencias e retrabalho",
)
async def obter_resumo_estatisticas_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoEstatisticas, Depends(obter_servico_estatisticas)],
    periodo: Annotated[str, Query()] = "30d",
    escopo: Annotated[str, Query()] = "todas",
    etiqueta_id: Annotated[str | None, Query()] = None,
    fuso_horario: Annotated[str, Query()] = FUSO_PADRAO,
) -> RespostaEstatisticasResumo:
    resumo = await servico.obter_resumo(
        contexto.usuario.id,
        periodo=_normalizar_periodo(periodo),
        escopo=_normalizar_escopo(escopo),
        etiqueta_id=_normalizar_etiqueta_id(etiqueta_id),
        fuso_horario=fuso_horario,
    )
    return montar_resposta_resumo(resumo)


@roteador_diario.get(
    "/eventos",
    response_model=RespostaDiarioEventos,
    summary="Listar eventos ricos do diario do ciclo paginados por cursor",
)
async def listar_diario_eventos_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoEstatisticas, Depends(obter_servico_estatisticas)],
    limite: Annotated[int, Query()] = 20,
    cursor: Annotated[str | None, Query()] = None,
    tipo: Annotated[str | None, Query()] = None,
    busca: Annotated[str | None, Query()] = None,
) -> RespostaDiarioEventos:
    itens, proximo_cursor = await servico.listar_diario(
        contexto.usuario.id,
        limite=limite,
        cursor=cursor,
        tipo=tipo,
        busca=busca,
    )
    return RespostaDiarioEventos(
        itens=[montar_evento_diario_resposta(item) for item in itens],
        proximo_cursor=proximo_cursor,
    )


@roteador_preferencias.get(
    "",
    response_model=RespostaPreferenciasCenario,
    summary="Ler preferencias de cenario, audio, qualidade 3D e tutorial",
)
async def obter_preferencias_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoEstatisticas, Depends(obter_servico_estatisticas)],
) -> RespostaPreferenciasCenario:
    prefs = await servico.obter_preferencias(contexto.usuario.id)
    return montar_resposta_preferencias(prefs)


@roteador_preferencias.patch(
    "",
    response_model=RespostaPreferenciasCenario,
    summary="Atualizar preferencias de cenario preservando consentimento de clima",
)
async def atualizar_preferencias_rota(
    corpo: RequisicaoAtualizarPreferencias,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoEstatisticas, Depends(obter_servico_estatisticas)],
) -> RespostaPreferenciasCenario:
    carga: dict[str, Any] = corpo.model_dump(exclude_unset=True)
    prefs = await servico.atualizar_preferencias(
        contexto.usuario.id,
        patch=carga,
        campos_raiz=set(corpo.model_fields_set),
    )
    return montar_resposta_preferencias(prefs)
