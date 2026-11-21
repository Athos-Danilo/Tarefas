from typing import Any

from pydantic import BaseModel

from contratos.verificador_saude import EstadoDependencia, EstadoGeralSaude


class RespostaSaude(BaseModel):
    """Esquema HTTP de saida do endpoint /api/saude."""

    status: EstadoGeralSaude
    servico: str
    versao: str
    banco_relacional: EstadoDependencia
    banco_documental: EstadoDependencia
    timestamp: str


class DetalheErro(BaseModel):
    """Objeto interno do envelope padronizado de erro da API."""

    codigo: str
    mensagem: str
    detalhes: dict[str, Any] | None = None


class EnvelopeErro(BaseModel):
    """Envelope unico de erro para respostas 4xx e 5xx."""

    erro: DetalheErro
