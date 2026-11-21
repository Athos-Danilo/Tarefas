import calendar
from datetime import UTC, date, datetime, timedelta

from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import (
    DIA_SEMANA_MAX,
    DIA_SEMANA_MIN,
    INTERVALO_RECORRENCIA_MAX,
    ConfiguracaoRecorrencia,
    EspecificacaoProximaOcorrencia,
    NoTarefa,
)


def _para_utc(instante: datetime) -> datetime:
    if instante.tzinfo is None:
        return instante.replace(tzinfo=UTC)
    return instante.astimezone(UTC)


def _combinar_utc(data: date, referencia_hora: datetime) -> datetime:
    return datetime(
        data.year,
        data.month,
        data.day,
        referencia_hora.hour,
        referencia_hora.minute,
        referencia_hora.second,
        referencia_hora.microsecond,
        tzinfo=UTC,
    )


def _somar_meses(ano: int, mes: int, deslocamento: int) -> tuple[int, int]:
    total_meses = (ano * 12 + (mes - 1)) + deslocamento
    novo_ano, novo_mes_zero = divmod(total_meses, 12)
    return novo_ano, novo_mes_zero + 1


def _data_no_mes(ano: int, mes: int, dia_desejado: int) -> date:
    ultimo_dia = calendar.monthrange(ano, mes)[1]
    return date(ano, mes, min(dia_desejado, ultimo_dia))


def dia_semana_lume(data: date) -> int:
    """Converte data para convencao Lume (0=domingo, 1=segunda ... 6=sabado)."""
    return (data.weekday() + 1) % 7


def validar_configuracao_recorrencia(
    config: ConfiguracaoRecorrencia,
) -> ConfiguracaoRecorrencia:
    """Valida e normaliza a configuracao de recorrencia conforme regras de dominio."""
    if config.tipo == "nenhuma":
        return ConfiguracaoRecorrencia(tipo="nenhuma", dias_semana=(), dia_mes=None, intervalo=1)

    if config.intervalo < 1 or config.intervalo > INTERVALO_RECORRENCIA_MAX:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="O intervalo de recorrencia deve ficar entre 1 e 365.",
            status_http=422,
        )

    if config.tipo == "diaria":
        return ConfiguracaoRecorrencia(
            tipo="diaria",
            dias_semana=(),
            dia_mes=None,
            intervalo=config.intervalo,
        )

    if config.tipo == "semanal":
        if not config.dias_semana:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Recorrencia semanal exige ao menos um dia da semana.",
                status_http=422,
            )
        for dia in config.dias_semana:
            if dia < DIA_SEMANA_MIN or dia > DIA_SEMANA_MAX:
                raise ErroDeDominio(
                    codigo="VALIDACAO_INVALIDA",
                    mensagem="Cada dia da semana deve estar entre 0 (domingo) e 6 (sabado).",
                    status_http=422,
                )
        dias_unicos = tuple(sorted(set(config.dias_semana)))
        return ConfiguracaoRecorrencia(
            tipo="semanal",
            dias_semana=dias_unicos,
            dia_mes=None,
            intervalo=config.intervalo,
        )

    if config.dia_mes is not None and (config.dia_mes < 1 or config.dia_mes > 31):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="O dia do mes na recorrencia mensal deve estar entre 1 e 31.",
            status_http=422,
        )
    return ConfiguracaoRecorrencia(
        tipo="mensal",
        dias_semana=(),
        dia_mes=config.dia_mes,
        intervalo=config.intervalo,
    )


def _proxima_data_diaria(
    config: ConfiguracaoRecorrencia,
    data_ref: date,
    data_agora: date,
) -> date:
    piso = max(data_ref, data_agora)
    return piso + timedelta(days=config.intervalo)


def _proxima_data_semanal(
    config: ConfiguracaoRecorrencia,
    data_ref: date,
    data_agora: date,
) -> date:
    piso = max(data_ref, data_agora)
    dia_atual = dia_semana_lume(piso)

    for dia in config.dias_semana:
        if dia > dia_atual:
            return piso + timedelta(days=dia - dia_atual)

    domingo_semana_piso = piso - timedelta(days=dia_atual)
    domingo_alvo = domingo_semana_piso + timedelta(weeks=config.intervalo)
    return domingo_alvo + timedelta(days=config.dias_semana[0])


def _proxima_data_mensal(
    config: ConfiguracaoRecorrencia,
    data_ref: date,
    data_agora: date,
) -> date:
    piso = max(data_ref, data_agora)
    dia_alvo = config.dia_mes if config.dia_mes is not None else data_ref.day

    ano, mes = _somar_meses(data_ref.year, data_ref.month, config.intervalo)
    if (ano, mes) < (piso.year, piso.month):
        diff_meses = (piso.year - ano) * 12 + (piso.month - mes)
        saltos = diff_meses // config.intervalo
        if saltos > 0:
            ano, mes = _somar_meses(ano, mes, saltos * config.intervalo)

    candidato = _data_no_mes(ano, mes, dia_alvo)
    while candidato <= piso:
        ano, mes = _somar_meses(ano, mes, config.intervalo)
        candidato = _data_no_mes(ano, mes, dia_alvo)
    return candidato


_ESTRATEGIAS_DATA = {
    "diaria": _proxima_data_diaria,
    "semanal": _proxima_data_semanal,
    "mensal": _proxima_data_mensal,
}


def calcular_proxima_ocorrencia(
    config: ConfiguracaoRecorrencia,
    referencia_base: datetime,
    *,
    agora: datetime | None = None,
) -> datetime | None:
    """Calcula a proxima data UTC valida para uma regra de recorrencia."""
    regra = validar_configuracao_recorrencia(config)
    if regra.tipo == "nenhuma":
        return None

    ref_utc = _para_utc(referencia_base)
    agora_utc = _para_utc(agora) if agora is not None else datetime.now(UTC)
    estrategia = _ESTRATEGIAS_DATA[regra.tipo]
    proxima_data = estrategia(regra, ref_utc.date(), agora_utc.date())
    return _combinar_utc(proxima_data, ref_utc)


def gerar_proximas_ocorrencias(
    config: ConfiguracaoRecorrencia,
    referencia_base: datetime,
    quantidade: int,
    *,
    agora: datetime | None = None,
) -> tuple[datetime, ...]:
    """Gera de forma deterministica as proximas N ocorrencias da serie."""
    if quantidade < 0:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="A quantidade de ocorrencias nao pode ser negativa.",
            status_http=422,
        )

    regra = validar_configuracao_recorrencia(config)
    if regra.tipo == "nenhuma" or quantidade == 0:
        return ()

    if regra.tipo == "mensal" and regra.dia_mes is None:
        regra = ConfiguracaoRecorrencia(
            tipo="mensal",
            dia_mes=_para_utc(referencia_base).day,
            intervalo=regra.intervalo,
        )

    ocorrencias: list[datetime] = []
    cursor_ref = _para_utc(referencia_base)
    cursor_agora = _para_utc(agora) if agora is not None else datetime.now(UTC)

    for _ in range(quantidade):
        proxima = calcular_proxima_ocorrencia(regra, cursor_ref, agora=cursor_agora)
        if proxima is None:
            break
        ocorrencias.append(proxima)
        cursor_ref = proxima
        cursor_agora = proxima

    return tuple(ocorrencias)


def criar_especificacao_proxima_ocorrencia(
    tarefa: NoTarefa,
    *,
    agora: datetime | None = None,
) -> EspecificacaoProximaOcorrencia | None:
    """Produz a especificacao pura para criar a proxima ocorrencia apos conclusao."""
    regra = validar_configuracao_recorrencia(tarefa.recorrencia)
    if regra.tipo == "nenhuma":
        return None

    agora_utc = _para_utc(agora) if agora is not None else datetime.now(UTC)
    referencia = _para_utc(tarefa.prazo) if tarefa.prazo is not None else agora_utc
    proximo_prazo = calcular_proxima_ocorrencia(regra, referencia, agora=agora_utc)
    if proximo_prazo is None:
        return None

    return EspecificacaoProximaOcorrencia(
        titulo=tarefa.titulo,
        tarefa_pai_id=tarefa.tarefa_pai_id,
        prioridade=tarefa.prioridade,
        turno=tarefa.turno,
        profundidade=tarefa.profundidade,
        proximo_prazo=proximo_prazo,
        recorrencia=regra,
        serie_recorrencia_id=tarefa.serie_recorrencia_id,
    )
