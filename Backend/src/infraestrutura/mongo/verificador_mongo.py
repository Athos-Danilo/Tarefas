from contratos.verificador_saude import EstadoDependencia
from infraestrutura.mongo.conexao import GerenciadorMongo


class VerificadorMongo:
    """Adaptador de verificacao de saude para o banco documental MongoDB."""

    def __init__(self, gerenciador: GerenciadorMongo) -> None:
        self._gerenciador = gerenciador

    async def verificar(self) -> EstadoDependencia:
        disponivel = await self._gerenciador.verificar_conexao()
        return "conectado" if disponivel else "indisponivel"
