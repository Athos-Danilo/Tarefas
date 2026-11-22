from typing import Annotated

from fastapi import APIRouter, Depends, Query

from rotas.dependencias_autenticacao import (
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_clima,
)
from rotas.esquemas_autenticacao import formatar_instante_iso_utc
from rotas.esquemas_clima import (
    RequisicaoConsentimentoClima,
    RespostaBuscaCidades,
    RespostaClimaAtual,
    RespostaConsentimentoClima,
    SugestaoCidadeResposta,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_clima import ServicoClima

roteador_clima = APIRouter(prefix="/api/clima", tags=["Clima Local"])


@roteador_clima.get(
    "/cidades",
    response_model=RespostaBuscaCidades,
    summary="Buscar sugestoes de cidades no Open-Meteo com coordenadas aproximadas",
)
async def buscar_cidades_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoClima, Depends(obter_servico_clima)],
    q: str = Query(default="", description="Nome da cidade para busca"),
) -> RespostaBuscaCidades:
    del contexto
    sugestoes = await servico.buscar_cidades(q)
    return RespostaBuscaCidades(
        itens=[
            SugestaoCidadeResposta(
                cidade=item.cidade,
                uf=item.uf,
                pais=item.pais,
                latitude_aprox=item.latitude_aprox,
                longitude_aprox=item.longitude_aprox,
            )
            for item in sugestoes
        ]
    )


@roteador_clima.put(
    "/consentimento",
    response_model=RespostaConsentimentoClima,
    summary="Atualizar consentimento opt-in de clima local e localizacao aproximada",
)
async def atualizar_consentimento_clima_rota(
    corpo: RequisicaoConsentimentoClima,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoClima, Depends(obter_servico_clima)],
) -> RespostaConsentimentoClima:
    resultado = await servico.atualizar_consentimento(
        usuario_id=contexto.usuario.id,
        habilitado=corpo.habilitado,
        modo_localizacao=corpo.modo_localizacao,
        cidade=corpo.cidade,
        uf=corpo.uf,
        latitude_aprox=corpo.latitude_aprox,
        longitude_aprox=corpo.longitude_aprox,
    )
    return RespostaConsentimentoClima(
        habilitado=resultado.habilitado,
        modo_localizacao=resultado.modo_localizacao,
        cidade=resultado.cidade,
        uf=resultado.uf,
        latitude_aprox=resultado.latitude_aprox,
        longitude_aprox=resultado.longitude_aprox,
        estado_climatico=resultado.estado_climatico,
    )


@roteador_clima.get(
    "/atual",
    response_model=RespostaClimaAtual,
    summary="Consultar clima atual autorizado com cache por coordenada aproximada",
)
async def consultar_clima_atual_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoClima, Depends(obter_servico_clima)],
) -> RespostaClimaAtual:
    clima = await servico.consultar_clima_atual(contexto.usuario.id)
    return RespostaClimaAtual(
        habilitado=clima.habilitado,
        cidade=clima.cidade,
        uf=clima.uf,
        temperatura_c=clima.temperatura_c,
        codigo_wmo=clima.codigo_wmo,
        estado_climatico=clima.estado_climatico,
        descricao=clima.descricao,
        origem_cache=clima.origem_cache,
        atualizado_em=formatar_instante_iso_utc(clima.atualizado_em),
    )
