import re
from collections import defaultdict, deque
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import StatusTarefa

PapelGrupo = Literal["lider", "colaborador"]

MAX_MEMBROS_GRUPO = 10
MAX_VAGAS_GRUPO = 10
NOME_VAGA_MIN = 2
NOME_VAGA_MAX = 60

_REGEX_EMAIL_SIMPLES = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class VagaGrupoInfo:
    """Representacao pura de vaga nomeada em Tarefa em Conjunto."""

    id: UUID
    nome_exibicao: str
    email_opcional: str | None = None
    ocupada_por_usuario_id: UUID | None = None


@dataclass(frozen=True)
class MembroGrupoInfo:
    """Integrante ativo de uma Tarefa em Conjunto para calculo e autorizacao."""

    usuario_id: UUID
    nome_exibicao: str
    papel: PapelGrupo
    avatar_url: str | None = None


@dataclass(frozen=True)
class NoParaDesempenho:
    """Visao minima pura de um no da arvore para escopo e painel de grupo."""

    id: UUID
    tarefa_pai_id: UUID | None
    status: StatusTarefa
    responsavel_usuario_id: UUID | None = None
    vaga_responsavel_id: UUID | None = None


@dataclass(frozen=True)
class IntegranteDesempenho:
    """Metricas de execucao atribuidas a um integrante do grupo."""

    usuario_id: UUID
    nome_exibicao: str
    papel: PapelGrupo
    avatar_url: str | None
    atribuidas: int
    concluidas: int
    percentual: int


@dataclass(frozen=True)
class VagaAbertaDesempenho:
    """Metricas de uma vaga ainda livre no painel do grupo."""

    vaga_id: UUID
    nome_exibicao: str
    email_opcional: str | None
    atribuidas: int


@dataclass(frozen=True)
class ResumoGeralDesempenho:
    """Totais agregados das tarefas-folha do projeto em grupo."""

    total_subtarefas_folha: int
    folhas_concluidas: int
    percentual_geral: int


@dataclass(frozen=True)
class PainelDesempenhoGrupo:
    """Consolidado puro do painel da equipe em Tarefas em Conjunto."""

    tarefa_raiz_id: UUID
    titulo: str
    meu_papel: PapelGrupo
    link_convite_ativo: bool
    resumo_geral: ResumoGeralDesempenho
    integrantes: tuple[IntegranteDesempenho, ...]
    vagas_abertas: tuple[VagaAbertaDesempenho, ...]


def validar_nome_vaga(nome: str) -> str:
    """Colapsa espacos e valida comprimento entre 2 e 60 caracteres."""
    limpo = " ".join(nome.split())
    if len(limpo) < NOME_VAGA_MIN or len(limpo) > NOME_VAGA_MAX:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="O nome da vaga deve conter entre 2 e 60 caracteres.",
            status_http=422,
            detalhes={"minimo": NOME_VAGA_MIN, "maximo": NOME_VAGA_MAX},
        )
    return limpo


def normalizar_email_opcional(email: str | None) -> str | None:
    """Normaliza e-mail opcional de vaga para minusculas ou retorna None se vazio."""
    if email is None:
        return None
    limpo = email.strip().lower()
    if not limpo:
        return None
    if len(limpo) > 320 or not _REGEX_EMAIL_SIMPLES.fullmatch(limpo):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Informe um e-mail valido ou deixe em branco.",
            status_http=422,
        )
    return limpo


def validar_limite_vagas(total_vagas_atuais: int) -> None:
    """Impoe limite maximo de 10 vagas por tarefa-raiz compartilhada."""
    if total_vagas_atuais >= MAX_VAGAS_GRUPO:
        raise ErroDeDominio(
            codigo="LIMITE_MEMBROS_GRUPO_EXCEDIDO",
            mensagem="Limite maximo de 10 vagas por tarefa em conjunto atingido.",
            status_http=422,
            detalhes={"limite_vagas": MAX_VAGAS_GRUPO},
        )


def validar_limite_membros(total_membros_atuais: int) -> None:
    """Impoe limite maximo de 10 membros ativos por tarefa-raiz compartilhada."""
    if total_membros_atuais >= MAX_MEMBROS_GRUPO:
        raise ErroDeDominio(
            codigo="LIMITE_MEMBROS_GRUPO_EXCEDIDO",
            mensagem="Limite maximo de 10 participantes por tarefa em conjunto atingido.",
            status_http=422,
            detalhes={"limite_membros": MAX_MEMBROS_GRUPO},
        )


def validar_atribuicao_responsavel(
    responsavel_usuario_id: UUID | None,
    vaga_responsavel_id: UUID | None,
) -> None:
    """Garante no maximo um responsavel (usuario ou vaga) ou ambos nulos."""
    if responsavel_usuario_id is not None and vaga_responsavel_id is not None:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Informe no maximo um responsavel (membro ou vaga), nunca ambos.",
            status_http=422,
        )


def resolver_vaga_na_entrada(
    vagas: Sequence[VagaGrupoInfo],
    *,
    email_usuario: str,
    vaga_id_solicitada: UUID | None = None,
) -> UUID | None:
    """Resolve automaticamente por e-mail ou valida escolha explicita de vaga na entrada."""
    if vaga_id_solicitada is not None:
        alvo = next((v for v in vagas if v.id == vaga_id_solicitada), None)
        if alvo is None:
            raise ErroDeDominio(
                codigo="RECURSO_NAO_ENCONTRADO",
                mensagem="Vaga solicitada nao pertence a este convite.",
                status_http=404,
            )
        if alvo.ocupada_por_usuario_id is not None:
            raise ErroDeDominio(
                codigo="VAGA_JA_OCUPADA",
                mensagem="Esta vaga ja foi vinculada a outro participante.",
                status_http=409,
            )
        return alvo.id

    email_norm = email_usuario.strip().lower()
    if email_norm:
        for vaga in vagas:
            if (
                vaga.ocupada_por_usuario_id is None
                and vaga.email_opcional is not None
                and vaga.email_opcional.strip().lower() == email_norm
            ):
                return vaga.id
    return None


def exigir_lider(papel: PapelGrupo | None) -> None:
    """Bloqueia acoes administrativas de grupo quando o solicitante nao e o Lider."""
    if papel != "lider":
        raise ErroDeDominio(
            codigo="PERMISSAO_GRUPO_INSUFICIENTE",
            mensagem="Apenas o lider da tarefa em conjunto pode executar esta acao.",
            status_http=403,
        )


def no_pertence_ao_escopo_do_colaborador(
    nos: Sequence[NoParaDesempenho],
    alvo_id: UUID,
    colaborador_id: UUID,
) -> bool:
    """Verifica se o no ou seu ancestral com responsavel pertence ao colaborador."""
    por_id = {no.id: no for no in nos}
    atual = por_id.get(alvo_id)
    visitados: set[UUID] = set()

    while atual is not None and atual.id not in visitados:
        visitados.add(atual.id)
        if atual.responsavel_usuario_id is not None:
            return atual.responsavel_usuario_id == colaborador_id
        if atual.vaga_responsavel_id is not None:
            return False
        atual = por_id.get(atual.tarefa_pai_id) if atual.tarefa_pai_id is not None else None
    return False


def verificar_permissao_operacao_no(
    nos: Sequence[NoParaDesempenho],
    *,
    papel: PapelGrupo,
    usuario_id: UUID,
    alvo_id: UUID,
    exige_lideranca: bool = False,
) -> None:
    """Autoriza Lider em toda a arvore e Colaborador apenas dentro das suas subtarefas."""
    if exige_lideranca:
        exigir_lider(papel)
        return
    if papel == "lider":
        return
    if not no_pertence_ao_escopo_do_colaborador(nos, alvo_id, usuario_id):
        raise ErroDeDominio(
            codigo="PERMISSAO_GRUPO_INSUFICIENTE",
            mensagem="Voce so pode alterar subtarefas atribuidas a voce neste grupo.",
            status_http=403,
        )


def validar_saida_membro(papel: PapelGrupo, total_membros: int) -> None:
    """Impede saida do Lider enquanto houver outros participantes sem transferir antes."""
    if papel == "lider" and total_membros > 1:
        raise ErroDeDominio(
            codigo="LIDER_DEVE_TRANSFERIR_OU_EXCLUIR",
            mensagem="Transfira a lideranca ou exclua a tarefa em conjunto antes de sair.",
            status_http=409,
        )


def calcular_desempenho_grupo(
    *,
    tarefa_raiz_id: UUID,
    titulo_raiz: str,
    meu_papel: PapelGrupo,
    link_convite_ativo: bool,
    nos: Sequence[NoParaDesempenho],
    membros: Sequence[MembroGrupoInfo],
    vagas: Sequence[VagaGrupoInfo],
) -> PainelDesempenhoGrupo:
    """Calcula progresso geral e atribuido por integrante/vaga sobre as tarefas-folha."""
    por_id = {no.id: no for no in nos}
    filhos_por_pai: dict[UUID | None, list[UUID]] = defaultdict(list)
    for no in nos:
        filhos_por_pai[no.tarefa_pai_id].append(no.id)

    raiz = por_id.get(tarefa_raiz_id)
    if raiz is None:
        return PainelDesempenhoGrupo(
            tarefa_raiz_id=tarefa_raiz_id,
            titulo=titulo_raiz,
            meu_papel=meu_papel,
            link_convite_ativo=link_convite_ativo,
            resumo_geral=ResumoGeralDesempenho(
                total_subtarefas_folha=0,
                folhas_concluidas=0,
                percentual_geral=0,
            ),
            integrantes=(),
            vagas_abertas=(),
        )

    atribuidas_usuario: dict[UUID, int] = defaultdict(int)
    concluidas_usuario: dict[UUID, int] = defaultdict(int)
    atribuidas_vaga: dict[UUID, int] = defaultdict(int)
    total_folhas = 0
    folhas_concluidas = 0

    fila: deque[tuple[UUID, UUID | None, UUID | None]] = deque(
        [(raiz.id, raiz.responsavel_usuario_id, raiz.vaga_responsavel_id)]
    )
    visitados: set[UUID] = set()

    while fila:
        atual_id, resp_uid_herd, resp_vid_herd = fila.popleft()
        if atual_id in visitados:
            continue
        visitados.add(atual_id)

        no_atual = por_id[atual_id]
        if no_atual.responsavel_usuario_id is not None:
            resp_uid = no_atual.responsavel_usuario_id
            resp_vid = None
        elif no_atual.vaga_responsavel_id is not None:
            resp_uid = None
            resp_vid = no_atual.vaga_responsavel_id
        else:
            resp_uid = resp_uid_herd
            resp_vid = resp_vid_herd

        filhas = filhos_por_pai.get(atual_id, [])
        if filhas:
            for fid in filhas:
                fila.append((fid, resp_uid, resp_vid))
            continue

        total_folhas += 1
        feita = no_atual.status == "concluida"
        if feita:
            folhas_concluidas += 1
        if resp_uid is not None:
            atribuidas_usuario[resp_uid] += 1
            if feita:
                concluidas_usuario[resp_uid] += 1
        elif resp_vid is not None:
            atribuidas_vaga[resp_vid] += 1

    percentual_geral = round((folhas_concluidas / total_folhas) * 100) if total_folhas > 0 else 0

    integrantes_resumo = tuple(
        IntegranteDesempenho(
            usuario_id=membro.usuario_id,
            nome_exibicao=membro.nome_exibicao,
            papel=membro.papel,
            avatar_url=membro.avatar_url,
            atribuidas=atribuidas_usuario.get(membro.usuario_id, 0),
            concluidas=concluidas_usuario.get(membro.usuario_id, 0),
            percentual=(
                round(
                    (
                        concluidas_usuario.get(membro.usuario_id, 0)
                        / atribuidas_usuario.get(membro.usuario_id, 0)
                    )
                    * 100
                )
                if atribuidas_usuario.get(membro.usuario_id, 0) > 0
                else 0
            ),
        )
        for membro in membros
    )

    vagas_abertas = tuple(
        VagaAbertaDesempenho(
            vaga_id=vaga.id,
            nome_exibicao=vaga.nome_exibicao,
            email_opcional=vaga.email_opcional,
            atribuidas=atribuidas_vaga.get(vaga.id, 0),
        )
        for vaga in vagas
        if vaga.ocupada_por_usuario_id is None
    )

    return PainelDesempenhoGrupo(
        tarefa_raiz_id=tarefa_raiz_id,
        titulo=titulo_raiz,
        meu_papel=meu_papel,
        link_convite_ativo=link_convite_ativo,
        resumo_geral=ResumoGeralDesempenho(
            total_subtarefas_folha=total_folhas,
            folhas_concluidas=folhas_concluidas,
            percentual_geral=percentual_geral,
        ),
        integrantes=integrantes_resumo,
        vagas_abertas=vagas_abertas,
    )
