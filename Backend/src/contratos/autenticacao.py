from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID


@dataclass(frozen=True, slots=True)
class IdentidadeGoogle:
    """Dados validados retornados pelo provedor Google OAuth 2.0."""

    google_sub: str
    email: str
    email_verificado: bool
    nome_sugerido: str
    foto_url: str | None


@dataclass(frozen=True, slots=True)
class RegistroUsuario:
    """Representacao de leitura do usuario autenticado."""

    id: UUID
    google_sub: str
    email: str
    nome_exibicao: str
    avatar_tipo: str
    avatar_id: str | None
    foto_google_url: str | None
    avatar_arquivo: str | None
    primeiro_acesso_concluido: bool
    atualizado_em: datetime


@dataclass(frozen=True, slots=True)
class RegistroSessao:
    """Representacao da sessao server-side."""

    id: UUID
    usuario_id: UUID
    token_hash: str
    csrf_token_hash: str
    expira_em: datetime
    expiracao_absoluta_em: datetime
    criado_em: datetime
    revogada_em: datetime | None


class ProvedorGoogleOAuth(Protocol):
    """Porta abstrata para autorizacao e troca de codigo com o Google."""

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        """Monta URL de redirecionamento para consentimento Google."""
        ...

    async def trocar_codigo_por_usuario(
        self,
        codigo: str,
        code_verifier: str,
    ) -> IdentidadeGoogle:
        """Troca authorization code e PKCE verifier pela identidade verificada."""
        ...


class RepositorioUsuarios(Protocol):
    """Porta de persistencia para contas de usuarios e conclusao de primeiro acesso."""

    async def buscar_por_id(self, usuario_id: UUID) -> RegistroUsuario | None: ...

    async def buscar_ou_criar_por_google(
        self,
        identidade: IdentidadeGoogle,
    ) -> RegistroUsuario: ...

    async def concluir_primeiro_acesso(
        self,
        usuario_id: UUID,
        nome_exibicao: str,
        avatar_tipo: str,
        avatar_id: str | None,
        criar_arvore_guia: bool,
    ) -> tuple[RegistroUsuario, UUID | None]: ...

    async def atualizar_perfil(
        self,
        usuario_id: UUID,
        nome_exibicao: str,
        avatar_tipo: str,
        avatar_id: str | None,
    ) -> RegistroUsuario: ...

    async def registrar_arquivo_avatar(
        self,
        usuario_id: UUID,
        nome_arquivo: str,
    ) -> RegistroUsuario: ...

    async def excluir_definitivo(self, usuario_id: UUID) -> str | None:
        """Exclui o usuario em definitivo no PostgreSQL e retorna avatar_arquivo anterior."""
        ...


class RepositorioSessoes(Protocol):
    """Porta de persistencia para sessoes server-side e revogacao."""

    async def criar(
        self,
        usuario_id: UUID,
        token_hash: str,
        csrf_token_hash: str,
        expira_em: datetime,
        expiracao_absoluta_em: datetime,
    ) -> RegistroSessao: ...

    async def buscar_ativa_por_token_hash(
        self,
        token_hash: str,
        agora: datetime,
    ) -> RegistroSessao | None: ...

    async def atualizar_expiracao(self, sessao_id: UUID, nova_expiracao: datetime) -> None: ...

    async def revogar_por_id(self, sessao_id: UUID, revogada_em: datetime) -> None: ...

    async def revogar_todas_do_usuario(self, usuario_id: UUID, revogada_em: datetime) -> int: ...


class LimpadorDadosDocumentaisConta(Protocol):
    """Porta para remocao integral dos documentos do usuario no MongoDB."""

    async def remover_dados_usuario(self, usuario_id: str) -> None: ...


class ArmazenamentoAvatar(Protocol):
    """Porta para gravacao, leitura e remocao de arquivo de avatar enviado."""

    def salvar(self, nome_arquivo: str, conteudo_webp: bytes) -> None: ...

    def ler(self, nome_arquivo: str) -> bytes | None: ...

    def remover(self, nome_arquivo: str) -> None: ...
