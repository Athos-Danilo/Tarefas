import hmac
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import (
    ProvedorGoogleOAuth,
    RegistroSessao,
    RegistroUsuario,
    RepositorioSessoes,
    RepositorioUsuarios,
)
from dominio.autenticacao import (
    DURACAO_SESSAO_DESLIZANTE,
    TETO_ABSOLUTO_SESSAO,
    assinar_estado_oauth,
    calcular_nova_expiracao_deslizante,
    gerar_hash_sha256,
    gerar_pkce_code_challenge,
    gerar_pkce_code_verifier,
    gerar_token_aleatorio,
    validar_estado_oauth,
)
from dominio.erros import ErroDeDominio


@dataclass(frozen=True, slots=True)
class ResultadoLoginOAuth:
    """Resultado completo do callback Google com tokens brutos para cookies."""

    usuario: RegistroUsuario
    sessao: RegistroSessao
    token_sessao_bruto: str
    token_csrf_bruto: str
    redirecionar_para: str


@dataclass(frozen=True, slots=True)
class ContextoAutenticado:
    """Identidade e sessao renovada extraidas do cookie de requisicao."""

    usuario: RegistroUsuario
    sessao: RegistroSessao


class ServicoAutenticacao:
    """Orquestra fluxo Google OAuth 2.0, sessoes deslizantes e protecao CSRF."""

    def __init__(
        self,
        configuracoes: Configuracoes,
        provedor_google: ProvedorGoogleOAuth,
        repositorio_usuarios: RepositorioUsuarios,
        repositorio_sessoes: RepositorioSessoes,
    ) -> None:
        self._configuracoes = configuracoes
        self._provedor = provedor_google
        self._usuarios = repositorio_usuarios
        self._sessoes = repositorio_sessoes

    def iniciar_login(self) -> tuple[str, str]:
        """Gera PKCE + state HMAC e devolve URL de redirecionamento e cookie assinado."""
        verificador = gerar_pkce_code_verifier()
        desafio = gerar_pkce_code_challenge(verificador)
        estado, token_assinado = assinar_estado_oauth(
            code_verifier=verificador,
            segredo=self._configuracoes.segredo_sessao,
        )
        url_autorizacao = self._provedor.gerar_url_autorizacao(
            state=estado,
            code_challenge=desafio,
        )
        return url_autorizacao, token_assinado

    async def concluir_callback(
        self,
        codigo: str | None,
        estado_recebido: str | None,
        token_assinado: str | None,
    ) -> ResultadoLoginOAuth:
        """Valida state, troca codigo com PKCE, registra usuario e cria sessao."""
        if not codigo or not codigo.strip():
            raise ErroDeDominio(
                codigo="OAUTH_INVALIDO",
                mensagem="Codigo de autorizacao Google ausente.",
                status_http=401,
            )

        code_verifier = validar_estado_oauth(
            estado_recebido=estado_recebido,
            token_assinado=token_assinado,
            segredo=self._configuracoes.segredo_sessao,
        )

        identidade = await self._provedor.trocar_codigo_por_usuario(
            codigo=codigo,
            code_verifier=code_verifier,
        )
        if not identidade.email_verificado:
            raise ErroDeDominio(
                codigo="OAUTH_INVALIDO",
                mensagem="O e-mail da conta Google precisa estar verificado.",
                status_http=401,
            )

        usuario = await self._usuarios.buscar_ou_criar_por_google(identidade)

        token_sessao = gerar_token_aleatorio(32)
        token_csrf = gerar_token_aleatorio(24)
        agora = datetime.now(UTC)
        expira_em = agora + DURACAO_SESSAO_DESLIZANTE
        expiracao_absoluta = agora + TETO_ABSOLUTO_SESSAO

        sessao = await self._sessoes.criar(
            usuario_id=usuario.id,
            token_hash=gerar_hash_sha256(token_sessao),
            csrf_token_hash=gerar_hash_sha256(token_csrf),
            expira_em=expira_em,
            expiracao_absoluta_em=expiracao_absoluta,
        )

        destino = "/jornada" if usuario.primeiro_acesso_concluido else "/primeiro-acesso"
        return ResultadoLoginOAuth(
            usuario=usuario,
            sessao=sessao,
            token_sessao_bruto=token_sessao,
            token_csrf_bruto=token_csrf,
            redirecionar_para=destino,
        )

    async def validar_sessao(self, token_sessao_bruto: str | None) -> ContextoAutenticado:
        """Valida cookie server-side e aplica renovacao deslizante respeitando teto de 30d."""
        if not token_sessao_bruto:
            raise ErroDeDominio(
                codigo="NAO_AUTENTICADO",
                mensagem="Sessao ausente. Faca login com Google para continuar.",
                status_http=401,
            )

        agora = datetime.now(UTC)
        sessao = await self._sessoes.buscar_ativa_por_token_hash(
            token_hash=gerar_hash_sha256(token_sessao_bruto),
            agora=agora,
        )
        if sessao is None:
            raise ErroDeDominio(
                codigo="NAO_AUTENTICADO",
                mensagem="Sessao invalida, revogada ou expirada.",
                status_http=401,
            )

        usuario = await self._usuarios.buscar_por_id(sessao.usuario_id)
        if usuario is None:
            raise ErroDeDominio(
                codigo="NAO_AUTENTICADO",
                mensagem="Conta nao localizada para a sessao atual.",
                status_http=401,
            )

        nova_expiracao = calcular_nova_expiracao_deslizante(agora, sessao.expiracao_absoluta_em)
        await self._sessoes.atualizar_expiracao(sessao.id, nova_expiracao)
        sessao_renovada = RegistroSessao(
            id=sessao.id,
            usuario_id=sessao.usuario_id,
            token_hash=sessao.token_hash,
            csrf_token_hash=sessao.csrf_token_hash,
            expira_em=nova_expiracao,
            expiracao_absoluta_em=sessao.expiracao_absoluta_em,
            criado_em=sessao.criado_em,
            revogada_em=sessao.revogada_em,
        )
        return ContextoAutenticado(usuario=usuario, sessao=sessao_renovada)

    def validar_csrf(
        self,
        sessao: RegistroSessao,
        csrf_cabecalho: str | None,
        csrf_cookie: str | None,
    ) -> None:
        """Exige correspondencia entre cabecalho X-CSRF-Token, cookie e hash da sessao."""
        if not csrf_cabecalho or not csrf_cookie:
            raise ErroDeDominio(
                codigo="CSRF_INVALIDO",
                mensagem="Cabecalho de protecao CSRF ausente ou invalido.",
                status_http=403,
            )

        if not hmac.compare_digest(csrf_cabecalho, csrf_cookie):
            raise ErroDeDominio(
                codigo="CSRF_INVALIDO",
                mensagem="Token CSRF divergente do cookie da sessao.",
                status_http=403,
            )

        hash_recebido = gerar_hash_sha256(csrf_cabecalho)
        if not hmac.compare_digest(hash_recebido, sessao.csrf_token_hash):
            raise ErroDeDominio(
                codigo="CSRF_INVALIDO",
                mensagem="Token CSRF invalido para a sessao autenticada.",
                status_http=403,
            )

    async def sair(self, sessao_id: UUID) -> None:
        await self._sessoes.revogar_por_id(sessao_id, datetime.now(UTC))

    async def sair_todos(self, usuario_id: UUID) -> int:
        return await self._sessoes.revogar_todas_do_usuario(usuario_id, datetime.now(UTC))
