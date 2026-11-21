from contratos.persistencia import FabricaSessaoRelacional
from contratos.verificador_saude import EstadoDependencia


class VerificadorPostgres:
    """Adaptador de verificacao de saude para o banco relacional PostgreSQL."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def verificar(self) -> EstadoDependencia:
        disponivel = await self._fabrica.verificar_conexao()
        return "conectado" if disponivel else "indisponivel"
