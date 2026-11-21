from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel

from contratos.autenticacao import RegistroUsuario
from dominio.autenticacao import resolver_url_avatar


def formatar_instante_iso_utc(instante: datetime) -> str:
    """Formata datetime timezone-aware no formato ISO 8601 UTC com sufixo Z."""
    return instante.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class UsuarioResumo(BaseModel):
    """Dados publicos do usuario na sessao e perfil."""

    id: UUID
    email: str
    nome_exibicao: str
    avatar_tipo: str
    avatar_id: str | None
    avatar_url: str | None
    primeiro_acesso_concluido: bool


class SessaoResumo(BaseModel):
    """Metadados temporais da sessao ativa."""

    expira_em: str
    expiracao_absoluta_em: str


class RespostaSessao(BaseModel):
    """Resposta de GET /api/autenticacao/sessao."""

    autenticado: bool
    usuario: UsuarioResumo
    sessao: SessaoResumo


class RespostaSairTodos(BaseModel):
    """Resposta de POST /api/autenticacao/sair-todos."""

    sessoes_revogadas: int


class RequisicaoPrimeiroAcesso(BaseModel):
    """Payload de POST /api/conta/primeiro-acesso."""

    nome_exibicao: str
    avatar_tipo: str
    avatar_id: str | None = None
    criar_arvore_guia: bool = True


class RespostaPrimeiroAcesso(BaseModel):
    """Resposta de POST /api/conta/primeiro-acesso."""

    primeiro_acesso_concluido: bool
    arvore_guia_criada: bool
    tarefa_guia_id: UUID | None


class RequisicaoAtualizarPerfil(BaseModel):
    """Payload de PATCH /api/conta/perfil."""

    nome_exibicao: str
    avatar_tipo: str
    avatar_id: str | None = None


class RespostaPerfil(BaseModel):
    """Resposta de GET e PATCH /api/conta/perfil."""

    id: UUID
    email: str
    nome_exibicao: str
    avatar_tipo: str
    avatar_id: str | None
    avatar_url: str | None
    primeiro_acesso_concluido: bool


class RespostaAvatarUpload(BaseModel):
    """Resposta de POST /api/conta/avatar."""

    avatar_tipo: str
    avatar_url: str
    largura: int
    altura: int


class RequisicaoExcluirConta(BaseModel):
    """Payload de confirmacao textual para POST /api/conta/excluir."""

    confirmacao: str


class RespostaExcluirConta(BaseModel):
    """Resposta de POST /api/conta/excluir."""

    conta_excluida: bool
    mensagem: str


def montar_usuario_resumo(usuario: RegistroUsuario) -> UsuarioResumo:
    """Converte RegistroUsuario de dominio para esquema HTTP."""
    versao_cache = int(usuario.atualizado_em.timestamp())
    return UsuarioResumo(
        id=usuario.id,
        email=usuario.email,
        nome_exibicao=usuario.nome_exibicao,
        avatar_tipo=usuario.avatar_tipo,
        avatar_id=usuario.avatar_id,
        avatar_url=resolver_url_avatar(
            avatar_tipo=usuario.avatar_tipo,
            avatar_id=usuario.avatar_id,
            foto_google_url=usuario.foto_google_url,
            avatar_arquivo=usuario.avatar_arquivo,
            versao_cache=versao_cache,
        ),
        primeiro_acesso_concluido=usuario.primeiro_acesso_concluido,
    )
