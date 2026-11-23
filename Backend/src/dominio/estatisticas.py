import re
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal, TypedDict, cast
from uuid import UUID
from zoneinfo import ZoneInfo

from contratos.foco import SessaoFocoRegistro
from contratos.tarefas import TarefaRegistro
from dominio.erros import ErroDeDominio
from dominio.preferencias_padrao import (
    ModoTemporal,
    PreferenciasAudio,
    PreferenciasCenario,
    PreferenciasTutorial,
    Qualidade3D,
    StatusTutorial,
)

PeriodoEstatisticas = Literal["7d", "30d", "90d", "tudo"]
EscopoEstatisticas = Literal["todas", "pessoais", "grupo"]
FormatoExportacaoDiario = Literal["md", "json"]

_PADRAO_HORA_HHMM = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")

_ROTULOS_TIPO_EVENTO: dict[str, str] = {
    "tarefa_criada": "Tarefa criada",
    "tarefa_concluida": "Tarefa concluída",
    "cascata_concluida": "Cascata concluída",
    "tarefa_reaberta": "Tarefa reaberta",
    "arvore_iluminada": "Constelação iluminada",
    "foco_concluido": "Sessão de foco concluída",
    "foco_interrompido": "Sessão de foco interrompida",
    "grupo_compartilhado": "Constelação compartilhada",
    "grupo_entrada": "Entrada no grupo",
    "grupo_atribuicao": "Atribuição em grupo",
    "grupo_lideranca": "Transferência de liderança",
    "grupo_membro_removido": "Membro removido",
    "grupo_saida": "Saída do grupo",
    "ciclo_diario": "Marco do ciclo",
}


class KpisEstatisticas(TypedDict):
    """Indicadores principais do painel D14."""

    total_criadas: int
    total_concluidas: int
    taxa_conclusao_pct: int
    tempo_medio_conclusao_horas: float
    pontualidade_pct: int
    sequencia_atual_dias: int
    sequencia_recorde_dias: int
    minutos_foco_totais: int
    taxa_foco_concluido_pct: int


class PontoSerieTemporal(TypedDict):
    """Ponto diario de produtividade e tempo de foco."""

    data: str
    criadas: int
    concluidas: int
    minutos_foco: int


class PontoMapaCalor(TypedDict):
    """Celula diaria do mapa de calor de atividade."""

    data: str
    intensidade: int
    acoes: int


class DistribuicaoTurno(TypedDict):
    """Contagem de conclusoes por turno."""

    manha: int
    tarde: int
    noite: int
    livre: int


class DistribuicaoPrioridade(TypedDict):
    """Contagem de conclusoes por prioridade."""

    baixa: int
    media: int
    alta: int
    urgente: int


class ItemPorEtiqueta(TypedDict):
    """Total de conclusoes por etiqueta."""

    etiqueta_id: str
    nome: str
    cor: str
    concluidas: int


class ResumoRecorrencias(TypedDict):
    """Consistencia de rotinas recorrentes."""

    rotinas_ativas: int
    ocorrencias_cumpridas: int
    taxa_consistencia_pct: int


class TituloRepetidoResumo(TypedDict):
    """Agrupamento por titulo normalizado para detectar habitos/repeticoes."""

    titulo_normalizado: str
    ocorrencias: int
    concluidas: int


class ResumoRepeticoesRetrabalho(TypedDict):
    """Indicadores de reaberturas e repeticoes de titulos."""

    total_reaberturas: int
    tarefas_reabertas_distintas: int
    titulos_mais_repetidos: list[TituloRepetidoResumo]


class ResumoArvores(TypedDict):
    """Metricas estruturais das constelacoes de tarefas."""

    constelacoes_concluidas: int
    profundidade_media: float


class ResumoEstatisticas(TypedDict):
    """Contrato completo de dominio para GET /api/estatisticas/resumo."""

    periodo: PeriodoEstatisticas
    escopo: EscopoEstatisticas
    kpis: KpisEstatisticas
    serie_temporal: list[PontoSerieTemporal]
    mapa_calor: list[PontoMapaCalor]
    por_turno: DistribuicaoTurno
    por_prioridade: DistribuicaoPrioridade
    por_etiqueta: list[ItemPorEtiqueta]
    recorrencias: ResumoRecorrencias
    repeticoes_e_retrabalho: ResumoRepeticoesRetrabalho
    arvores: ResumoArvores


def normalizar_titulo_repetido(titulo: str) -> str:
    """Normaliza titulo para consolidacao de ocorrencias repetidas."""
    return " ".join(titulo.strip().lower().split())


def calcular_intensidade_calor(acoes: int) -> int:
    """Converte total de acoes do dia na escala 0..4 do mapa de calor."""
    if acoes <= 0:
        return 0
    if acoes == 1:
        return 1
    if acoes <= 3:
        return 2
    if acoes <= 5:
        return 3
    return 4


def _data_local(instante: datetime, fuso: ZoneInfo) -> date:
    base = instante.replace(tzinfo=UTC) if instante.tzinfo is None else instante
    return base.astimezone(fuso).date()


def resolver_janela_periodo(
    periodo: PeriodoEstatisticas,
    hoje_local: date,
    datas_existentes: Sequence[date],
) -> tuple[date, date]:
    """Determina o intervalo fechado [data_inicio, data_fim] em data local."""
    if periodo == "7d":
        return hoje_local - timedelta(days=6), hoje_local
    if periodo == "30d":
        return hoje_local - timedelta(days=29), hoje_local
    if periodo == "90d":
        return hoje_local - timedelta(days=89), hoje_local
    datas_ate_hoje = [d for d in datas_existentes if d <= hoje_local]
    inicio = min(datas_ate_hoje) if datas_ate_hoje else hoje_local
    return inicio, hoje_local


def _calcular_sequencias(datas_conclusao: set[date], hoje_local: date) -> tuple[int, int]:
    if not datas_conclusao:
        return 0, 0

    ordenadas = sorted(d for d in datas_conclusao if d <= hoje_local)
    if not ordenadas:
        return 0, 0

    recorde = 1
    bloco = 1
    for indice in range(1, len(ordenadas)):
        if ordenadas[indice] == ordenadas[indice - 1] + timedelta(days=1):
            bloco += 1
            if bloco > recorde:
                recorde = bloco
        else:
            bloco = 1

    referencia = hoje_local if hoje_local in datas_conclusao else hoje_local - timedelta(days=1)
    atual = 0
    cursor = referencia
    while cursor in datas_conclusao:
        atual += 1
        cursor -= timedelta(days=1)
    return atual, max(recorde, atual)


def _filtrar_tarefas_escopo_e_etiqueta(
    tarefas: Sequence[TarefaRegistro],
    escopo: EscopoEstatisticas,
    etiqueta_id: UUID | None,
) -> list[TarefaRegistro]:
    filtradas: list[TarefaRegistro] = []
    for tarefa in tarefas:
        if escopo == "pessoais" and tarefa.compartilhada:
            continue
        if escopo == "grupo" and not tarefa.compartilhada:
            continue
        if etiqueta_id is not None and not any(etq.id == etiqueta_id for etq in tarefa.etiquetas):
            continue
        filtradas.append(tarefa)
    return filtradas


def _calcular_profundidade_media(tarefas: Sequence[TarefaRegistro]) -> float:
    if not tarefas:
        return 0.0

    ids_presentes = {t.id for t in tarefas}
    por_id = {t.id: t for t in tarefas}
    filhos_por_pai: dict[UUID, list[UUID]] = defaultdict(list)
    cabecas: list[TarefaRegistro] = []

    for tarefa in tarefas:
        if tarefa.tarefa_pai_id is not None and tarefa.tarefa_pai_id in ids_presentes:
            filhos_por_pai[tarefa.tarefa_pai_id].append(tarefa.id)
        else:
            cabecas.append(tarefa)

    profundidades: list[int] = []
    for cabeca in cabecas:
        max_niveis = 1
        pilha: list[tuple[UUID, int]] = [(cabeca.id, 1)]
        visitados: set[UUID] = set()
        while pilha:
            atual_id, nivel = pilha.pop()
            if atual_id in visitados:
                continue
            visitados.add(atual_id)
            if nivel > max_niveis:
                max_niveis = nivel
            for filho_id in filhos_por_pai.get(atual_id, []):
                if filho_id in por_id:
                    pilha.append((filho_id, nivel + 1))
        profundidades.append(max_niveis)

    if not profundidades:
        return 0.0
    return round(sum(profundidades) / len(profundidades), 1)


def calcular_estatisticas(
    *,
    tarefas: Sequence[TarefaRegistro],
    sessoes_foco: Sequence[SessaoFocoRegistro],
    periodo: PeriodoEstatisticas,
    escopo: EscopoEstatisticas,
    etiqueta_id: UUID | None,
    fuso: ZoneInfo,
    agora_utc: datetime,
) -> ResumoEstatisticas:
    """Consolida KPIs, series, mapa de calor, recorrencias e retrabalho sem I/O."""
    hoje_local = _data_local(agora_utc, fuso)
    tarefas_filtradas = _filtrar_tarefas_escopo_e_etiqueta(tarefas, escopo, etiqueta_id)
    ids_tarefas_filtradas = {t.id for t in tarefas_filtradas}
    restringir_foco_por_tarefa = escopo != "todas" or etiqueta_id is not None

    sessoes_escopo = [
        sessao
        for sessao in sessoes_foco
        if sessao.status in ("concluida", "interrompida")
        and (not restringir_foco_por_tarefa or sessao.tarefa_id in ids_tarefas_filtradas)
    ]

    datas_existentes: list[date] = []
    for t in tarefas_filtradas:
        datas_existentes.append(_data_local(t.criado_em, fuso))
        if t.concluida_em is not None:
            datas_existentes.append(_data_local(t.concluida_em, fuso))
    for s in sessoes_escopo:
        datas_existentes.append(_data_local(s.iniciada_em, fuso))

    data_inicio, data_fim = resolver_janela_periodo(periodo, hoje_local, datas_existentes)

    tarefas_criadas_janela = [
        t for t in tarefas_filtradas if data_inicio <= _data_local(t.criado_em, fuso) <= data_fim
    ]
    tarefas_concluidas_janela = [
        t
        for t in tarefas_filtradas
        if t.status == "concluida"
        and t.concluida_em is not None
        and data_inicio <= _data_local(t.concluida_em, fuso) <= data_fim
    ]
    sessoes_janela = [
        s for s in sessoes_escopo if data_inicio <= _data_local(s.iniciada_em, fuso) <= data_fim
    ]

    total_criadas = len(tarefas_criadas_janela)
    total_concluidas = len(tarefas_concluidas_janela)
    denominador_conclusao = max(total_criadas, total_concluidas)
    taxa_conclusao_pct = (
        min(100, round((total_concluidas / denominador_conclusao) * 100))
        if denominador_conclusao > 0
        else 0
    )

    duracoes_horas = [
        max(0.0, (t.concluida_em - t.criado_em).total_seconds() / 3600.0)
        for t in tarefas_concluidas_janela
        if t.concluida_em is not None
    ]
    tempo_medio_horas = (
        round(sum(duracoes_horas) / len(duracoes_horas), 1) if duracoes_horas else 0.0
    )

    concluidas_com_prazo = [
        t for t in tarefas_concluidas_janela if t.prazo is not None and t.concluida_em is not None
    ]
    if concluidas_com_prazo:
        no_prazo = sum(
            1
            for t in concluidas_com_prazo
            if t.concluida_em is not None and t.prazo is not None and t.concluida_em <= t.prazo
        )
        pontualidade_pct = round((no_prazo / len(concluidas_com_prazo)) * 100)
    else:
        pontualidade_pct = 0

    todas_datas_conclusao = {
        _data_local(t.concluida_em, fuso)
        for t in tarefas_filtradas
        if t.status == "concluida" and t.concluida_em is not None
    }
    sequencia_atual_dias, sequencia_recorde_dias = _calcular_sequencias(
        todas_datas_conclusao, hoje_local
    )

    segundos_foco_totais = sum(max(0, s.duracao_real_seg or 0) for s in sessoes_janela)
    minutos_foco_totais = round(segundos_foco_totais / 60)
    if sessoes_janela:
        sessoes_concluidas = sum(1 for s in sessoes_janela if s.status == "concluida")
        taxa_foco_concluido_pct = round((sessoes_concluidas / len(sessoes_janela)) * 100)
    else:
        taxa_foco_concluido_pct = 0

    criadas_por_dia: dict[date, int] = defaultdict(int)
    for t in tarefas_criadas_janela:
        criadas_por_dia[_data_local(t.criado_em, fuso)] += 1

    concluidas_por_dia: dict[date, int] = defaultdict(int)
    for t in tarefas_concluidas_janela:
        if t.concluida_em is not None:
            concluidas_por_dia[_data_local(t.concluida_em, fuso)] += 1

    seg_foco_por_dia: dict[date, int] = defaultdict(int)
    sessoes_por_dia: dict[date, int] = defaultdict(int)
    for s in sessoes_janela:
        dia_s = _data_local(s.iniciada_em, fuso)
        seg_foco_por_dia[dia_s] += max(0, s.duracao_real_seg or 0)
        sessoes_por_dia[dia_s] += 1

    serie_temporal: list[PontoSerieTemporal] = []
    mapa_calor: list[PontoMapaCalor] = []
    dia_cursor = data_inicio
    while dia_cursor <= data_fim:
        criadas_d = criadas_por_dia[dia_cursor]
        concluidas_d = concluidas_por_dia[dia_cursor]
        minutos_d = round(seg_foco_por_dia[dia_cursor] / 60)
        acoes_d = criadas_d + concluidas_d + sessoes_por_dia[dia_cursor]
        iso_dia = dia_cursor.isoformat()
        serie_temporal.append(
            {
                "data": iso_dia,
                "criadas": criadas_d,
                "concluidas": concluidas_d,
                "minutos_foco": minutos_d,
            }
        )
        mapa_calor.append(
            {
                "data": iso_dia,
                "intensidade": calcular_intensidade_calor(acoes_d),
                "acoes": acoes_d,
            }
        )
        dia_cursor += timedelta(days=1)

    por_turno: DistribuicaoTurno = {"manha": 0, "tarde": 0, "noite": 0, "livre": 0}
    por_prioridade: DistribuicaoPrioridade = {"baixa": 0, "media": 0, "alta": 0, "urgente": 0}
    contagem_etiquetas: dict[str, ItemPorEtiqueta] = {}

    for t in tarefas_concluidas_janela:
        por_turno[t.turno] += 1
        por_prioridade[t.prioridade] += 1
        for etq in t.etiquetas:
            if etiqueta_id is not None and etq.id != etiqueta_id:
                continue
            chave_etq = str(etq.id)
            if chave_etq not in contagem_etiquetas:
                contagem_etiquetas[chave_etq] = {
                    "etiqueta_id": chave_etq,
                    "nome": etq.nome,
                    "cor": etq.cor,
                    "concluidas": 0,
                }
            contagem_etiquetas[chave_etq]["concluidas"] += 1

    por_etiqueta = sorted(
        contagem_etiquetas.values(),
        key=lambda item: (-item["concluidas"], item["nome"].lower()),
    )

    # Recorrencias
    rotinas_ativas_ids = {
        t.serie_recorrencia_id or t.id
        for t in tarefas_filtradas
        if t.recorrencia.tipo != "nenhuma" and t.status != "concluida"
    }
    ocorrencias_cumpridas = sum(
        1
        for t in tarefas_concluidas_janela
        if t.recorrencia.tipo != "nenhuma" or t.serie_recorrencia_id is not None
    )
    pendentes_recorrentes_janela = sum(
        1
        for t in tarefas_filtradas
        if (t.recorrencia.tipo != "nenhuma" or t.serie_recorrencia_id is not None)
        and t.status != "concluida"
        and _data_local(t.criado_em, fuso) <= data_fim
    )
    total_recorrentes = ocorrencias_cumpridas + pendentes_recorrentes_janela
    taxa_consistencia_pct = (
        min(100, round((ocorrencias_cumpridas / total_recorrentes) * 100))
        if total_recorrentes > 0
        else 0
    )

    # Repeticoes e retrabalho
    tarefas_relevantes_janela = [
        t
        for t in tarefas_filtradas
        if _data_local(t.criado_em, fuso) <= data_fim
        and (
            periodo == "tudo"
            or (data_inicio <= _data_local(t.criado_em, fuso) <= data_fim)
            or (
                t.concluida_em is not None
                and data_inicio <= _data_local(t.concluida_em, fuso) <= data_fim
            )
            or (t.status != "concluida" and t.vezes_reaberta > 0)
        )
    ]
    total_reaberturas = sum(max(0, t.vezes_reaberta) for t in tarefas_relevantes_janela)
    tarefas_reabertas_distintas = sum(1 for t in tarefas_relevantes_janela if t.vezes_reaberta > 0)

    agrupamento_titulos: dict[str, dict[str, int]] = {}
    for t in tarefas_relevantes_janela:
        chave_titulo = normalizar_titulo_repetido(t.titulo)
        if not chave_titulo:
            continue
        if chave_titulo not in agrupamento_titulos:
            agrupamento_titulos[chave_titulo] = {"ocorrencias": 0, "concluidas": 0}
        agrupamento_titulos[chave_titulo]["ocorrencias"] += 1
        if t.status == "concluida":
            agrupamento_titulos[chave_titulo]["concluidas"] += 1

    titulos_mais_repetidos: list[TituloRepetidoResumo] = [
        {
            "titulo_normalizado": titulo,
            "ocorrencias": dados["ocorrencias"],
            "concluidas": dados["concluidas"],
        }
        for titulo, dados in agrupamento_titulos.items()
        if dados["ocorrencias"] >= 2
    ]
    titulos_mais_repetidos.sort(
        key=lambda item: (-item["ocorrencias"], -item["concluidas"], item["titulo_normalizado"])
    )

    # Arvores / constelacoes
    constelacoes_concluidas = sum(1 for t in tarefas_concluidas_janela if t.tarefa_pai_id is None)
    profundidade_media = _calcular_profundidade_media(tarefas_filtradas)

    return {
        "periodo": periodo,
        "escopo": escopo,
        "kpis": {
            "total_criadas": total_criadas,
            "total_concluidas": total_concluidas,
            "taxa_conclusao_pct": taxa_conclusao_pct,
            "tempo_medio_conclusao_horas": tempo_medio_horas,
            "pontualidade_pct": pontualidade_pct,
            "sequencia_atual_dias": sequencia_atual_dias,
            "sequencia_recorde_dias": sequencia_recorde_dias,
            "minutos_foco_totais": minutos_foco_totais,
            "taxa_foco_concluido_pct": taxa_foco_concluido_pct,
        },
        "serie_temporal": serie_temporal,
        "mapa_calor": mapa_calor,
        "por_turno": por_turno,
        "por_prioridade": por_prioridade,
        "por_etiqueta": por_etiqueta,
        "recorrencias": {
            "rotinas_ativas": len(rotinas_ativas_ids),
            "ocorrencias_cumpridas": ocorrencias_cumpridas,
            "taxa_consistencia_pct": taxa_consistencia_pct,
        },
        "repeticoes_e_retrabalho": {
            "total_reaberturas": total_reaberturas,
            "tarefas_reabertas_distintas": tarefas_reabertas_distintas,
            "titulos_mais_repetidos": titulos_mais_repetidos[:8],
        },
        "arvores": {
            "constelacoes_concluidas": constelacoes_concluidas,
            "profundidade_media": profundidade_media,
        },
    }


def _validar_volume_audio(valor: Any, nome_campo: str) -> float:
    if isinstance(valor, bool) or not isinstance(valor, int | float):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem=f"O campo {nome_campo} deve ser numerico entre 0 e 1.",
            status_http=422,
        )
    numero = float(valor)
    if numero < 0.0 or numero > 1.0:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem=f"O campo {nome_campo} deve estar entre 0.0 e 1.0.",
            status_http=422,
        )
    return round(numero, 2)


def validar_atualizacao_preferencias(
    *,
    atual: PreferenciasCenario,
    patch: dict[str, Any],
    campos_raiz: set[str],
    agora: datetime,
) -> PreferenciasCenario:
    """Aplica atualizacao parcial validada em preferencias_cenario sem perder clima."""
    instante = agora.astimezone(UTC)

    modo_temporal: ModoTemporal = atual["modo_temporal"]
    if "modo_temporal" in campos_raiz and patch.get("modo_temporal") is not None:
        candidato_modo = patch["modo_temporal"]
        if candidato_modo not in ("relogio_real", "simulador"):
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Modo temporal informado e invalido.",
                status_http=422,
            )
        modo_temporal = cast(ModoTemporal, candidato_modo)

    hora_simulada: str | None = atual["hora_simulada"]
    if "hora_simulada" in campos_raiz:
        candidato_hora = patch.get("hora_simulada")
        if candidato_hora is None:
            hora_simulada = None
        else:
            texto_hora = str(candidato_hora).strip()
            if not _PADRAO_HORA_HHMM.fullmatch(texto_hora):
                raise ErroDeDominio(
                    codigo="VALIDACAO_INVALIDA",
                    mensagem="A hora simulada deve estar no formato HH:MM (00:00 a 23:59).",
                    status_http=422,
                )
            hora_simulada = texto_hora

    qualidade_3d: Qualidade3D = atual["qualidade_3d"]
    if "qualidade_3d" in campos_raiz and patch.get("qualidade_3d") is not None:
        candidato_q = patch["qualidade_3d"]
        if candidato_q not in ("auto", "alto", "desempenho_2d"):
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Qualidade 3D informada e invalida.",
                status_http=422,
            )
        qualidade_3d = cast(Qualidade3D, candidato_q)

    reduzir_movimento = atual["reduzir_movimento"]
    if "reduzir_movimento" in campos_raiz and patch.get("reduzir_movimento") is not None:
        reduzir_movimento = bool(patch["reduzir_movimento"])

    audio: PreferenciasAudio = {
        "habilitado": atual["audio"]["habilitado"],
        "volume_geral": atual["audio"]["volume_geral"],
        "volume_efeitos": atual["audio"]["volume_efeitos"],
        "volume_ambiente": atual["audio"]["volume_ambiente"],
    }
    if "audio" in campos_raiz and isinstance(patch.get("audio"), dict):
        bloco_audio = patch["audio"]
        if "habilitado" in bloco_audio and bloco_audio["habilitado"] is not None:
            audio["habilitado"] = bool(bloco_audio["habilitado"])
        if "volume_geral" in bloco_audio and bloco_audio["volume_geral"] is not None:
            audio["volume_geral"] = _validar_volume_audio(
                bloco_audio["volume_geral"], "audio.volume_geral"
            )
        if "volume_efeitos" in bloco_audio and bloco_audio["volume_efeitos"] is not None:
            audio["volume_efeitos"] = _validar_volume_audio(
                bloco_audio["volume_efeitos"], "audio.volume_efeitos"
            )
        if "volume_ambiente" in bloco_audio and bloco_audio["volume_ambiente"] is not None:
            audio["volume_ambiente"] = _validar_volume_audio(
                bloco_audio["volume_ambiente"], "audio.volume_ambiente"
            )

    tutorial: PreferenciasTutorial = dict(atual["tutorial"])  # type: ignore[assignment]
    if "tutorial" in campos_raiz and isinstance(patch.get("tutorial"), dict):
        bloco_tut = patch["tutorial"]
        if "status" in bloco_tut and bloco_tut["status"] is not None:
            candidato_status = bloco_tut["status"]
            if candidato_status not in ("pendente", "pulado", "concluido"):
                raise ErroDeDominio(
                    codigo="VALIDACAO_INVALIDA",
                    mensagem="Status do tutorial informado e invalido.",
                    status_http=422,
                )
            tutorial["status"] = cast(StatusTutorial, candidato_status)
        if "etapa_atual" in bloco_tut and bloco_tut["etapa_atual"] is not None:
            etapa_bruta = bloco_tut["etapa_atual"]
            if (
                isinstance(etapa_bruta, bool)
                or not isinstance(etapa_bruta, int)
                or etapa_bruta < 0
                or etapa_bruta > 6
            ):
                raise ErroDeDominio(
                    codigo="VALIDACAO_INVALIDA",
                    mensagem="A etapa atual do tutorial deve estar entre 0 e 6.",
                    status_http=422,
                )
            tutorial["etapa_atual"] = etapa_bruta
        tutorial["atualizado_em"] = instante

    return {
        "usuario_id": atual["usuario_id"],
        "modo_temporal": modo_temporal,
        "hora_simulada": hora_simulada,
        "qualidade_3d": qualidade_3d,
        "reduzir_movimento": reduzir_movimento,
        "clima": dict(atual["clima"]),  # type: ignore[typeddict-item]
        "audio": audio,
        "tutorial": tutorial,
        "atualizado_em": instante,
    }


def formatar_diario_markdown(
    *,
    eventos: Sequence[dict[str, Any]],
    fuso: ZoneInfo,
) -> str:
    """Formata eventos do diario do ciclo em documento Markdown em pt-BR."""
    linhas = [
        "# Diário do Ciclo - Lume",
        "",
        f"Total de registros exportados: {len(eventos)}",
        "",
    ]
    if not eventos:
        linhas.append("_Nenhum evento registrado no intervalo selecionado._")
        return "\n".join(linhas)

    for evento in eventos:
        criado_bruto = evento.get("criado_em")
        if isinstance(criado_bruto, datetime):
            dt_aware = (
                criado_bruto.replace(tzinfo=UTC) if criado_bruto.tzinfo is None else criado_bruto
            )
            carimbo = dt_aware.astimezone(fuso).strftime("%d/%m/%Y %H:%M")
        else:
            carimbo = str(criado_bruto or "")
        tipo = str(evento.get("tipo_evento", ""))
        rotulo = _ROTULOS_TIPO_EVENTO.get(tipo, tipo)
        momento = str(evento.get("momento_do_dia", "")).strip()
        resumo = str(evento.get("resumo", "")).strip()
        cabecalho = f"- **{carimbo}** | {rotulo}"
        if momento:
            cabecalho += f" ({momento})"
        linhas.append(f"{cabecalho}: {resumo}")

    return "\n".join(linhas)
