from collections import defaultdict, deque
from collections.abc import Sequence
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import UUID

from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import (
    PROFUNDIDADE_MAXIMA,
    TTL_DESFAZER_CASCATA_SEGUNDOS,
    EstadoAnteriorNo,
    EstrategiaExclusao,
    MetricasNoTarefa,
    NoTarefa,
    RegistroDesfazerCascata,
    ResultadoConclusao,
    ResultadoDesfazer,
    ResultadoExclusao,
    ResultadoMovimentacao,
    ResultadoReabertura,
    StatusTarefa,
    validar_limite_filhas_diretas,
    validar_limites_criacao_usuario,
    validar_titulo_tarefa,
)


def _garantir_utc(instante: datetime | None) -> datetime:
    if instante is None:
        return datetime.now(UTC)
    if instante.tzinfo is None:
        return instante.replace(tzinfo=UTC)
    return instante.astimezone(UTC)


def _indexar_nos(
    nos: Sequence[NoTarefa],
) -> tuple[dict[UUID, NoTarefa], dict[UUID | None, list[UUID]]]:
    por_id: dict[UUID, NoTarefa] = {}
    filhos_por_pai: dict[UUID | None, list[UUID]] = defaultdict(list)
    for no in nos:
        if no.id in por_id:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Existem nos duplicados na arvore de tarefas.",
                status_http=422,
            )
        por_id[no.id] = no
        filhos_por_pai[no.tarefa_pai_id].append(no.id)
    return por_id, filhos_por_pai


def _exigir_no(por_id: dict[UUID, NoTarefa], tarefa_id: UUID) -> NoTarefa:
    no = por_id.get(tarefa_id)
    if no is None:
        raise ErroDeDominio(
            codigo="TAREFA_NAO_ENCONTRADA",
            mensagem="Tarefa informada nao existe nesta arvore.",
            status_http=404,
        )
    return no


def _coletar_descendentes(
    filhos_por_pai: dict[UUID | None, list[UUID]],
    raiz_id: UUID,
) -> tuple[UUID, ...]:
    fila: deque[UUID] = deque(filhos_por_pai.get(raiz_id, []))
    descendentes: list[UUID] = []
    while fila:
        atual_id = fila.popleft()
        descendentes.append(atual_id)
        fila.extend(filhos_por_pai.get(atual_id, []))
    return tuple(descendentes)


def _altura_subarvore(
    filhos_por_pai: dict[UUID | None, list[UUID]],
    raiz_id: UUID,
) -> int:
    pilha: list[tuple[UUID, int]] = [(raiz_id, 1)]
    altura_maxima = 1
    while pilha:
        atual_id, altura = pilha.pop()
        if altura > altura_maxima:
            altura_maxima = altura
        for filho_id in filhos_por_pai.get(atual_id, []):
            pilha.append((filho_id, altura + 1))
    return altura_maxima


def _ordenar_como_entrada(
    nos_originais: Sequence[NoTarefa],
    mapa: dict[UUID, NoTarefa],
) -> tuple[NoTarefa, ...]:
    return tuple(mapa[no.id] for no in nos_originais if no.id in mapa)


def _reconciliar_ancestrais_conclusao(
    mapa: dict[UUID, NoTarefa],
    filhos_por_pai: dict[UUID | None, list[UUID]],
    pai_inicial_id: UUID | None,
    instante: datetime,
    snapshots: list[EstadoAnteriorNo] | None = None,
) -> tuple[UUID, ...]:
    atual_id = pai_inicial_id
    ancestrais_concluidos: list[UUID] = []

    while atual_id is not None:
        filhas = filhos_por_pai.get(atual_id, [])
        if not filhas:
            break
        if any(mapa[fid].status != "concluida" for fid in filhas):
            break

        atual = mapa[atual_id]
        if atual.status != "concluida":
            if snapshots is not None:
                snapshots.append(
                    EstadoAnteriorNo(
                        tarefa_id=atual.id,
                        status_anterior=atual.status,
                        concluida_em_anterior=atual.concluida_em,
                    )
                )
            mapa[atual_id] = replace(atual, status="concluida", concluida_em=instante)
            ancestrais_concluidos.append(atual_id)
        atual_id = atual.tarefa_pai_id

    return tuple(ancestrais_concluidos)


def _reabrir_ancestrais_em_andamento(
    mapa: dict[UUID, NoTarefa],
    pai_inicial_id: UUID | None,
    *,
    incrementar_reabertura: bool,
) -> tuple[UUID, ...]:
    atual_id = pai_inicial_id
    ancestrais_reabertos: list[UUID] = []

    while atual_id is not None:
        atual = mapa[atual_id]
        if atual.status == "concluida":
            novo_total = atual.vezes_reaberta + (1 if incrementar_reabertura else 0)
            mapa[atual_id] = replace(
                atual,
                status="em_andamento",
                concluida_em=None,
                vezes_reaberta=novo_total,
            )
            ancestrais_reabertos.append(atual_id)
        atual_id = atual.tarefa_pai_id

    return tuple(ancestrais_reabertos)


def _validar_integridade_indexada(
    por_id: dict[UUID, NoTarefa],
) -> dict[UUID, int]:
    profundidades: dict[UUID, int] = {}

    for no_id in por_id:
        if no_id in profundidades:
            continue

        caminho: list[UUID] = []
        em_visita: set[UUID] = set()
        atual_id: UUID | None = no_id

        while atual_id is not None and atual_id not in profundidades:
            if atual_id in em_visita:
                raise ErroDeDominio(
                    codigo="CICLO_DETECTADO",
                    mensagem="Ciclo hierarquico detectado na arvore de tarefas.",
                    status_http=409,
                )
            no_atual = por_id.get(atual_id)
            if no_atual is None:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa-pai informada nao foi encontrada.",
                    status_http=404,
                )
            em_visita.add(atual_id)
            caminho.append(atual_id)
            atual_id = no_atual.tarefa_pai_id

        profundidade_base = 0 if atual_id is None else profundidades[atual_id]
        for passo, item_id in enumerate(reversed(caminho), start=1):
            profundidade = profundidade_base + passo
            if profundidade > PROFUNDIDADE_MAXIMA:
                raise ErroDeDominio(
                    codigo="PROFUNDIDADE_EXCEDIDA",
                    mensagem="A arvore de tarefas permite no maximo 5 niveis de profundidade.",
                    status_http=422,
                    detalhes={
                        "profundidade_maxima": PROFUNDIDADE_MAXIMA,
                        "profundidade_resultante": profundidade,
                    },
                )
            profundidades[item_id] = profundidade

    return profundidades


def validar_integridade_arvore(nos: Sequence[NoTarefa]) -> dict[UUID, int]:
    """Valida existencia de pais, ausencia de ciclos e teto de 5 niveis."""
    por_id, _ = _indexar_nos(nos)
    return _validar_integridade_indexada(por_id)


def validar_criacao_no(
    nos: Sequence[NoTarefa],
    *,
    titulo: str,
    tarefa_pai_id: UUID | None,
    total_ativas_usuario: int,
    total_geral_usuario: int,
    status_inicial: StatusTarefa = "pendente",
) -> tuple[str, int, tuple[UUID, ...]]:
    """Valida titulo, limites globais, profundidade e retorna ancestrais a reabrir."""
    titulo_limpo = validar_titulo_tarefa(titulo)
    validar_limites_criacao_usuario(
        total_ativas_usuario=total_ativas_usuario,
        total_geral_usuario=total_geral_usuario,
        status_inicial=status_inicial,
    )

    por_id, filhos_por_pai = _indexar_nos(nos)
    profundidades = _validar_integridade_indexada(por_id)

    if tarefa_pai_id is None:
        return titulo_limpo, 1, ()

    _exigir_no(por_id, tarefa_pai_id)
    validar_limite_filhas_diretas(len(filhos_por_pai.get(tarefa_pai_id, [])))

    profundidade_resultante = profundidades[tarefa_pai_id] + 1
    if profundidade_resultante > PROFUNDIDADE_MAXIMA:
        raise ErroDeDominio(
            codigo="PROFUNDIDADE_EXCEDIDA",
            mensagem="A arvore de tarefas permite no maximo 5 niveis de profundidade.",
            status_http=422,
            detalhes={
                "profundidade_maxima": PROFUNDIDADE_MAXIMA,
                "profundidade_resultante": profundidade_resultante,
            },
        )

    ancestrais_a_reabrir: list[UUID] = []
    if status_inicial != "concluida":
        atual_id: UUID | None = tarefa_pai_id
        while atual_id is not None:
            atual = por_id[atual_id]
            if atual.status == "concluida":
                ancestrais_a_reabrir.append(atual_id)
            atual_id = atual.tarefa_pai_id

    return titulo_limpo, profundidade_resultante, tuple(ancestrais_a_reabrir)


def calcular_metricas_arvore(nos: Sequence[NoTarefa]) -> dict[UUID, MetricasNoTarefa]:
    """Calcula progresso por tarefas-folha e alerta descendente urgente para cada no."""
    por_id, filhos_por_pai = _indexar_nos(nos)
    profundidades = _validar_integridade_indexada(por_id)
    metricas: dict[UUID, MetricasNoTarefa] = {}

    ordem_ascendente = sorted(por_id.keys(), key=lambda nid: profundidades[nid], reverse=True)
    for no_id in ordem_ascendente:
        no = por_id[no_id]
        filhas = filhos_por_pai.get(no_id, [])

        if not filhas:
            concluida = no.status == "concluida"
            metricas[no_id] = MetricasNoTarefa(
                tarefa_id=no_id,
                total_folhas=1,
                folhas_concluidas=1 if concluida else 0,
                percentual_conclusao=100 if concluida else 0,
                tem_filha_urgente_aberta=False,
            )
            continue

        total_folhas = sum(metricas[fid].total_folhas for fid in filhas)
        folhas_concluidas = sum(metricas[fid].folhas_concluidas for fid in filhas)
        percentual = round((folhas_concluidas / total_folhas) * 100)
        tem_urgente = any(
            (por_id[fid].prioridade == "urgente" and por_id[fid].status != "concluida")
            or metricas[fid].tem_filha_urgente_aberta
            for fid in filhas
        )
        metricas[no_id] = MetricasNoTarefa(
            tarefa_id=no_id,
            total_folhas=total_folhas,
            folhas_concluidas=folhas_concluidas,
            percentual_conclusao=percentual,
            tem_filha_urgente_aberta=tem_urgente,
        )

    return metricas


def concluir_tarefa(
    nos: Sequence[NoTarefa],
    tarefa_id: UUID,
    *,
    confirmar_cascata: bool = False,
    agora: datetime | None = None,
) -> ResultadoConclusao:
    """Conclui tarefa (com cascata opcional) e propaga conclusao bottom-up aos ancestrais."""
    por_id, filhos_por_pai = _indexar_nos(nos)
    _validar_integridade_indexada(por_id)
    alvo = _exigir_no(por_id, tarefa_id)

    descendentes = _coletar_descendentes(filhos_por_pai, tarefa_id)
    descendentes_abertos = [did for did in descendentes if por_id[did].status != "concluida"]
    if descendentes_abertos and not confirmar_cascata:
        raise ErroDeDominio(
            codigo="CONFIRMACAO_CASCATA_OBRIGATORIA",
            mensagem=(
                "Esta tarefa possui subtarefas em aberto. Confirme para concluir em cascata."
            ),
            status_http=409,
            detalhes={"descendentes_em_aberto": len(descendentes_abertos)},
        )

    if alvo.status == "concluida" and not descendentes_abertos:
        return ResultadoConclusao(
            nos_atualizados=tuple(nos),
            nos_concluidos=(),
            ancestrais_atualizados=(),
            registro_desfazer=None,
        )

    instante = _garantir_utc(agora)
    mapa = dict(por_id)
    snapshots: list[EstadoAnteriorNo] = []
    nos_concluidos: list[UUID] = []

    for item_id in (tarefa_id, *descendentes):
        item = mapa[item_id]
        if item.status != "concluida":
            snapshots.append(
                EstadoAnteriorNo(
                    tarefa_id=item.id,
                    status_anterior=item.status,
                    concluida_em_anterior=item.concluida_em,
                )
            )
            mapa[item_id] = replace(item, status="concluida", concluida_em=instante)
            nos_concluidos.append(item_id)

    ancestrais = _reconciliar_ancestrais_conclusao(
        mapa,
        filhos_por_pai,
        alvo.tarefa_pai_id,
        instante,
        snapshots=snapshots,
    )

    registro: RegistroDesfazerCascata | None = None
    if len(snapshots) > 1:
        registro = RegistroDesfazerCascata(
            tarefa_raiz_acao_id=tarefa_id,
            criado_em=instante,
            expira_em=instante + timedelta(seconds=TTL_DESFAZER_CASCATA_SEGUNDOS),
            estados_anteriores=tuple(snapshots),
            consumido=False,
        )

    return ResultadoConclusao(
        nos_atualizados=_ordenar_como_entrada(nos, mapa),
        nos_concluidos=tuple(nos_concluidos),
        ancestrais_atualizados=ancestrais,
        registro_desfazer=registro,
    )


def desfazer_conclusao_cascata(
    nos: Sequence[NoTarefa],
    registro: RegistroDesfazerCascata,
    *,
    agora: datetime | None = None,
) -> ResultadoDesfazer:
    """Restaura exatamente o estado anterior de conclusao em lote dentro da janela de 15s."""
    instante = _garantir_utc(agora)
    if registro.consumido or instante > _garantir_utc(registro.expira_em):
        raise ErroDeDominio(
            codigo="DESFAZER_EXPIRADO",
            mensagem="A janela de desfazer desta conclusao em cascata expirou.",
            status_http=409,
        )

    por_id, _ = _indexar_nos(nos)
    _validar_integridade_indexada(por_id)
    mapa = dict(por_id)
    restaurados: list[UUID] = []

    for snapshot in registro.estados_anteriores:
        atual = mapa.get(snapshot.tarefa_id)
        if atual is None:
            continue
        mapa[snapshot.tarefa_id] = replace(
            atual,
            status=snapshot.status_anterior,
            concluida_em=snapshot.concluida_em_anterior,
        )
        restaurados.append(snapshot.tarefa_id)

    return ResultadoDesfazer(
        nos_atualizados=_ordenar_como_entrada(nos, mapa),
        nos_restaurados=tuple(restaurados),
        registro_atualizado=replace(registro, consumido=True),
    )


def reabrir_tarefa(
    nos: Sequence[NoTarefa],
    tarefa_id: UUID,
    *,
    status_destino: StatusTarefa = "em_andamento",
) -> ResultadoReabertura:
    """Reabre tarefa concluida e seus ancestrais concluidos, incrementando vezes_reaberta."""
    if status_destino not in ("pendente", "em_andamento"):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="O status de destino da reabertura deve ser 'pendente' ou 'em_andamento'.",
            status_http=422,
        )

    por_id, _ = _indexar_nos(nos)
    _validar_integridade_indexada(por_id)
    alvo = _exigir_no(por_id, tarefa_id)

    if alvo.status != "concluida":
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Apenas tarefas com status 'concluida' podem ser reabertas.",
            status_http=422,
        )

    mapa = dict(por_id)
    mapa[tarefa_id] = replace(
        alvo,
        status=status_destino,
        concluida_em=None,
        vezes_reaberta=alvo.vezes_reaberta + 1,
    )
    ancestrais = _reabrir_ancestrais_em_andamento(
        mapa,
        alvo.tarefa_pai_id,
        incrementar_reabertura=True,
    )

    return ResultadoReabertura(
        nos_atualizados=_ordenar_como_entrada(nos, mapa),
        nos_reabertos=(tarefa_id,),
        ancestrais_reabertos=ancestrais,
    )


def mover_tarefa(
    nos: Sequence[NoTarefa],
    tarefa_id: UUID,
    *,
    novo_pai_id: UUID | None,
    agora: datetime | None = None,
) -> ResultadoMovimentacao:
    """Executa reparenting ou promocao a raiz validando ciclos, 5 niveis e limites."""
    por_id, filhos_por_pai = _indexar_nos(nos)
    profundidades = _validar_integridade_indexada(por_id)
    alvo = _exigir_no(por_id, tarefa_id)
    descendentes = _coletar_descendentes(filhos_por_pai, tarefa_id)

    if novo_pai_id is not None:
        _exigir_no(por_id, novo_pai_id)
        if novo_pai_id == tarefa_id or novo_pai_id in descendentes:
            raise ErroDeDominio(
                codigo="CICLO_DETECTADO",
                mensagem="Nao e possivel mover uma tarefa para si mesma ou para um descendente.",
                status_http=409,
            )
        if alvo.tarefa_pai_id != novo_pai_id:
            validar_limite_filhas_diretas(len(filhos_por_pai.get(novo_pai_id, [])))
        nova_profundidade_base = profundidades[novo_pai_id] + 1
    else:
        nova_profundidade_base = 1

    altura = _altura_subarvore(filhos_por_pai, tarefa_id)
    profundidade_final = nova_profundidade_base + altura - 1
    if profundidade_final > PROFUNDIDADE_MAXIMA:
        raise ErroDeDominio(
            codigo="PROFUNDIDADE_EXCEDIDA",
            mensagem="A movimentacao ultrapassa o limite maximo de 5 niveis.",
            status_http=422,
            detalhes={
                "profundidade_maxima": PROFUNDIDADE_MAXIMA,
                "profundidade_resultante": profundidade_final,
            },
        )

    pai_antigo_id = alvo.tarefa_pai_id
    if pai_antigo_id == novo_pai_id:
        return ResultadoMovimentacao(
            nos_atualizados=tuple(nos),
            ancestrais_concluidos=(),
            ancestrais_reabertos=(),
        )

    mapa = dict(por_id)
    delta_profundidade = nova_profundidade_base - profundidades[tarefa_id]
    mapa[tarefa_id] = replace(
        alvo,
        tarefa_pai_id=novo_pai_id,
        profundidade=nova_profundidade_base,
    )
    for desc_id in descendentes:
        desc = mapa[desc_id]
        mapa[desc_id] = replace(desc, profundidade=profundidades[desc_id] + delta_profundidade)

    _, filhos_pos = _indexar_nos(tuple(mapa.values()))
    instante = _garantir_utc(agora)
    ancestrais_concluidos: list[UUID] = list(
        _reconciliar_ancestrais_conclusao(mapa, filhos_pos, pai_antigo_id, instante)
    )

    subarvore_aberta = any(mapa[nid].status != "concluida" for nid in (tarefa_id, *descendentes))
    ancestrais_reabertos: tuple[UUID, ...] = ()
    if novo_pai_id is not None:
        if subarvore_aberta:
            ancestrais_reabertos = _reabrir_ancestrais_em_andamento(
                mapa,
                novo_pai_id,
                incrementar_reabertura=False,
            )
        else:
            ancestrais_concluidos.extend(
                _reconciliar_ancestrais_conclusao(mapa, filhos_pos, novo_pai_id, instante)
            )

    return ResultadoMovimentacao(
        nos_atualizados=_ordenar_como_entrada(nos, mapa),
        ancestrais_concluidos=tuple(ancestrais_concluidos),
        ancestrais_reabertos=ancestrais_reabertos,
    )


def planejar_exclusao_tarefa(
    nos: Sequence[NoTarefa],
    tarefa_id: UUID,
    *,
    estrategia: EstrategiaExclusao | None = None,
    agora: datetime | None = None,
) -> ResultadoExclusao:
    """Planeja exclusao segura de tarefa em cascata ou promovendo suas filhas diretas."""
    por_id, filhos_por_pai = _indexar_nos(nos)
    profundidades = _validar_integridade_indexada(por_id)
    alvo = _exigir_no(por_id, tarefa_id)
    descendentes = _coletar_descendentes(filhos_por_pai, tarefa_id)
    filhas_diretas = tuple(filhos_por_pai.get(tarefa_id, []))

    if descendentes and estrategia is None:
        raise ErroDeDominio(
            codigo="CONFIRMACAO_ESTRATEGIA_OBRIGATORIA",
            mensagem="Escolha excluir tudo em cascata ou promover as filhas diretas.",
            status_http=409,
            detalhes={"total_descendentes": len(descendentes)},
        )

    estrategia_efetiva: EstrategiaExclusao = estrategia or "cascata"
    mapa = dict(por_id)
    filhas_promovidas: tuple[UUID, ...] = ()
    removidos: set[UUID]

    if estrategia_efetiva == "promover_filhas" and descendentes:
        if alvo.tarefa_pai_id is not None:
            filhas_atuais_pai = len(filhos_por_pai.get(alvo.tarefa_pai_id, []))
            validar_limite_filhas_diretas(
                filhas_atuais_pai - 1,
                adicionais=len(filhas_diretas),
            )

        for desc_id in descendentes:
            desc = mapa[desc_id]
            novo_pai = alvo.tarefa_pai_id if desc.tarefa_pai_id == tarefa_id else desc.tarefa_pai_id
            mapa[desc_id] = replace(
                desc,
                tarefa_pai_id=novo_pai,
                profundidade=profundidades[desc_id] - 1,
            )
        filhas_promovidas = filhas_diretas
        removidos = {tarefa_id}
    else:
        removidos = {tarefa_id, *descendentes}

    for rid in removidos:
        mapa.pop(rid, None)

    restantes_parciais = _ordenar_como_entrada(nos, mapa)
    _, filhos_pos = _indexar_nos(restantes_parciais)
    ancestrais_reconciliados = _reconciliar_ancestrais_conclusao(
        mapa,
        filhos_pos,
        alvo.tarefa_pai_id,
        _garantir_utc(agora),
    )

    return ResultadoExclusao(
        nos_restantes=_ordenar_como_entrada(nos, mapa),
        ids_removidos=tuple(no.id for no in nos if no.id in removidos),
        filhas_promovidas=filhas_promovidas,
        ancestrais_reconciliados=ancestrais_reconciliados,
        estrategia_aplicada=estrategia_efetiva,
    )
