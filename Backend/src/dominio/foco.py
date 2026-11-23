from datetime import datetime
from typing import Literal

from dominio.erros import ErroDeDominio

DURACAO_FOCO_MIN_SEG = 60
DURACAO_FOCO_MAX_SEG = 14400
LIMITE_HISTORICO_FOCO_PADRAO = 20
LIMITE_HISTORICO_FOCO_MAX = 100

StatusSessaoFoco = Literal["em_andamento", "concluida", "interrompida"]


def validar_duracao_planejada(duracao_seg: int) -> int:
    """Valida a duracao planejada da sessao entre 1 minuto e 4 horas."""
    valor = int(duracao_seg)
    if valor < DURACAO_FOCO_MIN_SEG or valor > DURACAO_FOCO_MAX_SEG:
        raise ErroDeDominio(
            codigo="DURACAO_FOCO_INVALIDA",
            mensagem=(
                f"A duracao planejada do foco deve ficar entre {DURACAO_FOCO_MIN_SEG} "
                f"e {DURACAO_FOCO_MAX_SEG} segundos."
            ),
            status_http=422,
        )
    return valor


def normalizar_limite_historico(limite: int) -> int:
    """Garante limite seguro de consulta para historico recente de sessoes."""
    valor = int(limite)
    if valor < 1 or valor > LIMITE_HISTORICO_FOCO_MAX:
        raise ErroDeDominio(
            codigo="LIMITE_HISTORICO_INVALIDO",
            mensagem=(f"O limite do historico deve ficar entre 1 e {LIMITE_HISTORICO_FOCO_MAX}."),
            status_http=422,
        )
    return valor


def calcular_duracao_real_seg(
    *,
    iniciada_em: datetime,
    encerrada_em: datetime,
    duracao_informada_seg: int | None,
) -> int:
    """Resolve duracao real em segundos usando o valor informado ou o relogio."""
    if duracao_informada_seg is not None:
        valor = int(duracao_informada_seg)
        if valor < 0 or valor > DURACAO_FOCO_MAX_SEG:
            raise ErroDeDominio(
                codigo="DURACAO_REAL_INVALIDA",
                mensagem=(
                    "A duracao real informada deve ficar entre 0 e "
                    f"{DURACAO_FOCO_MAX_SEG} segundos."
                ),
                status_http=422,
            )
        return valor

    decorrido = int((encerrada_em - iniciada_em).total_seconds())
    return max(0, min(DURACAO_FOCO_MAX_SEG, decorrido))
