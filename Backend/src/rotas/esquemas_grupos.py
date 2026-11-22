from uuid import UUID

from pydantic import BaseModel

from dominio.grupos import PapelGrupo


class RespostaCompartilharGrupo(BaseModel):
    """Resposta de POST /api/grupos/{tarefa_raiz_id}/compartilhar."""

    tarefa_raiz_id: UUID
    compartilhada: bool
    meu_papel: PapelGrupo
    codigo_token: str
    link_convite: str


class RequisicaoCriarVaga(BaseModel):
    """Payload de POST /api/grupos/{tarefa_raiz_id}/vagas."""

    nome_exibicao: str
    email_opcional: str | None = None


class VagaGrupoResposta(BaseModel):
    """Representacao de vaga nomeada."""

    id: UUID
    tarefa_raiz_id: UUID
    nome_exibicao: str
    email_opcional: str | None
    ocupada_por_usuario_id: UUID | None
    criada_em: str


class RespostaRegenerarConvite(BaseModel):
    """Resposta de POST /api/grupos/{tarefa_raiz_id}/convites/regenerar."""

    codigo_token: str
    link_convite: str
    ativo: bool


class MembroPreviaResposta(BaseModel):
    """Membro ativo exibido na previa do convite."""

    usuario_id: UUID
    nome_exibicao: str
    avatar_url: str | None
    papel: PapelGrupo


class VagaDisponivelPreviaResposta(BaseModel):
    """Vaga livre exibida na previa do convite."""

    id: UUID
    nome_exibicao: str
    email_opcional: str | None


class RespostaPreviaConvite(BaseModel):
    """Resposta de GET /api/grupos/convites/{token}."""

    tarefa_raiz_id: UUID
    titulo: str
    lider_nome: str
    membros_ativos: list[MembroPreviaResposta]
    vagas_disponiveis: list[VagaDisponivelPreviaResposta]
    ja_e_membro: bool


class RequisicaoEntrarConvite(BaseModel):
    """Payload opcional de POST /api/grupos/convites/{token}/entrar."""

    vaga_id: UUID | None = None


class RespostaEntrarConvite(BaseModel):
    """Resposta de POST /api/grupos/convites/{token}/entrar."""

    tarefa_raiz_id: UUID
    papel: PapelGrupo
    vaga_vinculada_id: UUID | None
    subtarefas_herdadas: int
    ja_era_membro: bool


class RequisicaoAtribuirResponsavel(BaseModel):
    """Payload de PATCH /api/tarefas/{tarefa_id}/atribuir."""

    responsavel_usuario_id: UUID | None = None
    vaga_responsavel_id: UUID | None = None


class ResumoGeralPainelResposta(BaseModel):
    """Resumo quantitativo de folhas da equipe."""

    total_subtarefas_folha: int
    folhas_concluidas: int
    percentual_geral: int


class IntegrantePainelResposta(BaseModel):
    """Desempenho individual no painel do grupo."""

    usuario_id: UUID
    nome_exibicao: str
    papel: PapelGrupo
    avatar_url: str | None
    atribuidas: int
    concluidas: int
    percentual: int


class VagaAbertaPainelResposta(BaseModel):
    """Vaga ainda nao vinculada e suas subtarefas reservadas."""

    vaga_id: UUID
    nome_exibicao: str
    email_opcional: str | None
    atribuidas: int


class AtividadeGrupoResposta(BaseModel):
    """Registro na linha do tempo do projeto em conjunto."""

    evento_id: str
    autor_nome: str
    tipo_evento: str
    resumo: str
    criado_em: str


class RespostaPainelDesempenhoGrupo(BaseModel):
    """Resposta de GET /api/grupos/{tarefa_raiz_id}/desempenho."""

    tarefa_raiz_id: UUID
    titulo: str
    meu_papel: PapelGrupo
    link_convite_ativo: bool
    codigo_token: str | None
    resumo_geral: ResumoGeralPainelResposta
    integrantes: list[IntegrantePainelResposta]
    vagas_abertas: list[VagaAbertaPainelResposta]
    atividade_recente: list[AtividadeGrupoResposta]


class RequisicaoTransferirLideranca(BaseModel):
    """Payload de POST /api/grupos/{tarefa_raiz_id}/transferir-lideranca."""

    novo_lider_usuario_id: UUID


class RespostaTransferirLideranca(BaseModel):
    """Resposta de POST /api/grupos/{tarefa_raiz_id}/transferir-lideranca."""

    lideranca_transferida: bool
    novo_lider_usuario_id: UUID


class RespostaSairGrupo(BaseModel):
    """Resposta de POST /api/grupos/{tarefa_raiz_id}/sair."""

    saiu_do_grupo: bool
    subtarefas_desvinculadas: int
