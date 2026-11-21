from datetime import UTC, datetime

from configuracao.configuracoes import Configuracoes
from contratos.verificador_saude import EstadoDependencia
from servicos.servico_de_saude import ServicoDeSaude


class VerificadorEmMemoria:
    def __init__(self, estado: EstadoDependencia) -> None:
        self._estado = estado

    async def verificar(self) -> EstadoDependencia:
        return self._estado


async def test_deve_retornar_status_ok_quando_dependencias_estao_conectadas() -> None:
    servico = ServicoDeSaude(
        configuracoes=Configuracoes(_env_file=None),
        verificador_relacional=VerificadorEmMemoria("conectado"),
        verificador_documental=VerificadorEmMemoria("conectado"),
    )

    resultado = await servico.consultar_saude()

    assert resultado.status == "ok"
    assert resultado.servico == "lume-api"
    assert resultado.versao == "0.1.0"
    assert resultado.banco_relacional == "conectado"
    assert resultado.banco_documental == "conectado"


async def test_deve_retornar_status_ok_quando_dependencias_nao_estao_configuradas() -> None:
    servico = ServicoDeSaude(
        configuracoes=Configuracoes(_env_file=None),
        verificador_relacional=VerificadorEmMemoria("nao_configurado"),
        verificador_documental=VerificadorEmMemoria("nao_configurado"),
    )

    resultado = await servico.consultar_saude()

    assert resultado.status == "ok"
    assert resultado.banco_relacional == "nao_configurado"
    assert resultado.banco_documental == "nao_configurado"


async def test_deve_retornar_status_degradado_quando_dependencia_esta_indisponivel() -> None:
    servico_doc = ServicoDeSaude(
        configuracoes=Configuracoes(_env_file=None),
        verificador_relacional=VerificadorEmMemoria("conectado"),
        verificador_documental=VerificadorEmMemoria("indisponivel"),
    )
    servico_rel = ServicoDeSaude(
        configuracoes=Configuracoes(_env_file=None),
        verificador_relacional=VerificadorEmMemoria("indisponivel"),
        verificador_documental=VerificadorEmMemoria("nao_configurado"),
    )

    assert (await servico_doc.consultar_saude()).status == "degradado"
    assert (await servico_rel.consultar_saude()).status == "degradado"


async def test_deve_formatar_timestamp_em_iso_8601_utc_com_sufixo_z() -> None:
    instante_fixo = datetime(2026, 11, 21, 14, 30, 0, tzinfo=UTC)
    servico = ServicoDeSaude(
        configuracoes=Configuracoes(_env_file=None),
        verificador_relacional=VerificadorEmMemoria("nao_configurado"),
        verificador_documental=VerificadorEmMemoria("nao_configurado"),
        relogio=lambda: instante_fixo,
    )

    resultado = await servico.consultar_saude()

    assert resultado.timestamp == "2026-11-21T14:30:00Z"
