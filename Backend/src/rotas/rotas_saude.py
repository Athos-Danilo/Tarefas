from dataclasses import asdict
from typing import Annotated, cast

from fastapi import APIRouter, Depends, Request

from configuracao.configuracoes import Configuracoes
from contratos.verificador_saude import VerificadorDeDependencia
from rotas.esquemas_saude import RespostaSaude
from servicos.servico_de_saude import ServicoDeSaude

roteador_saude = APIRouter(prefix="/api", tags=["Saude"])


def obter_servico_de_saude(requisicao: Request) -> ServicoDeSaude:
    """Compoe o ServicoDeSaude usando dependencias registradas na aplicacao."""
    configuracoes = cast(Configuracoes, requisicao.app.state.configuracoes)
    verificador_relacional = cast(
        VerificadorDeDependencia,
        requisicao.app.state.verificador_relacional,
    )
    verificador_documental = cast(
        VerificadorDeDependencia,
        requisicao.app.state.verificador_documental,
    )
    return ServicoDeSaude(
        configuracoes=configuracoes,
        verificador_relacional=verificador_relacional,
        verificador_documental=verificador_documental,
    )


@roteador_saude.get("/saude", response_model=RespostaSaude, summary="Consultar saude da API")
async def consultar_saude(
    servico: Annotated[ServicoDeSaude, Depends(obter_servico_de_saude)],
) -> RespostaSaude:
    """Verifica a disponibilidade basica do servico e de suas dependencias."""
    resultado = await servico.consultar_saude()
    return RespostaSaude(**asdict(resultado))
