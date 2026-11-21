from typing import Literal, Protocol

EstadoDependencia = Literal["conectado", "nao_configurado", "indisponivel"]
EstadoGeralSaude = Literal["ok", "degradado"]


class VerificadorDeDependencia(Protocol):
    """Porta abstrata para sondagem de saude de bancos ou servicos externos."""

    async def verificar(self) -> EstadoDependencia:
        """Retorna o estado atual da dependencia monitorada."""
        ...
