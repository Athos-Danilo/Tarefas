from contratos.verificador_saude import EstadoDependencia


class VerificadorAindaNaoConfigurado:
    """Adaptador inicial para dependencias que serao ligadas a partir da Fase 07."""

    async def verificar(self) -> EstadoDependencia:
        return "nao_configurado"
