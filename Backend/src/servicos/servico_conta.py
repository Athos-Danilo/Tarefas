from uuid import UUID

from contratos.autenticacao import (
    ArmazenamentoAvatar,
    LimpadorDadosDocumentaisConta,
    RegistroUsuario,
    RepositorioUsuarios,
)
from contratos.persistencia import RepositorioPreferenciasCenario
from dominio.autenticacao import (
    CONFIRMACAO_EXCLUSAO_EXATA,
    processar_imagem_avatar,
    validar_escolha_avatar,
    validar_nome_exibicao,
)
from dominio.erros import ErroDeDominio
from dominio.preferencias_padrao import criar_preferencias_cenario_padrao


class ServicoConta:
    """Casos de uso de primeiro acesso, perfil, avatar e exclusao definitiva."""

    def __init__(
        self,
        repositorio_usuarios: RepositorioUsuarios,
        armazenamento_avatar: ArmazenamentoAvatar,
        repositorio_preferencias: RepositorioPreferenciasCenario | None = None,
        limpador_documental: LimpadorDadosDocumentaisConta | None = None,
    ) -> None:
        self._usuarios = repositorio_usuarios
        self._avatares = armazenamento_avatar
        self._preferencias = repositorio_preferencias
        self._limpador = limpador_documental

    async def obter_perfil(self, usuario_id: UUID) -> RegistroUsuario:
        usuario = await self._usuarios.buscar_por_id(usuario_id)
        if usuario is None:
            raise ErroDeDominio(
                codigo="NAO_AUTENTICADO",
                mensagem="Usuario nao encontrado.",
                status_http=401,
            )
        return usuario

    async def concluir_primeiro_acesso(
        self,
        usuario_id: UUID,
        nome_exibicao: str,
        avatar_tipo: str,
        avatar_id: str | None,
        criar_arvore_guia: bool,
    ) -> tuple[RegistroUsuario, UUID | None]:
        nome_valido = validar_nome_exibicao(nome_exibicao)
        tipo_valido, id_valido = validar_escolha_avatar(avatar_tipo, avatar_id)

        usuario, tarefa_guia_id = await self._usuarios.concluir_primeiro_acesso(
            usuario_id=usuario_id,
            nome_exibicao=nome_valido,
            avatar_tipo=tipo_valido,
            avatar_id=id_valido,
            criar_arvore_guia=criar_arvore_guia,
        )

        if self._preferencias is not None:
            padrao = criar_preferencias_cenario_padrao(str(usuario.id))
            await self._preferencias.salvar(padrao)

        return usuario, tarefa_guia_id

    async def atualizar_perfil(
        self,
        usuario_id: UUID,
        nome_exibicao: str,
        avatar_tipo: str,
        avatar_id: str | None,
    ) -> RegistroUsuario:
        nome_valido = validar_nome_exibicao(nome_exibicao)
        tipo_valido, id_valido = validar_escolha_avatar(avatar_tipo, avatar_id)

        atual = await self.obter_perfil(usuario_id)
        if tipo_valido == "upload" and not atual.avatar_arquivo:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Envie uma imagem antes de selecionar o avatar de upload.",
                status_http=422,
            )

        return await self._usuarios.atualizar_perfil(
            usuario_id=usuario_id,
            nome_exibicao=nome_valido,
            avatar_tipo=tipo_valido,
            avatar_id=id_valido,
        )

    async def enviar_avatar(self, usuario_id: UUID, conteudo_bruto: bytes) -> RegistroUsuario:
        webp_bytes = processar_imagem_avatar(conteudo_bruto)
        atual = await self.obter_perfil(usuario_id)
        nome_arquivo = f"{usuario_id}.webp"

        self._avatares.salvar(nome_arquivo, webp_bytes)
        if atual.avatar_arquivo and atual.avatar_arquivo != nome_arquivo:
            self._avatares.remover(atual.avatar_arquivo)

        return await self._usuarios.registrar_arquivo_avatar(usuario_id, nome_arquivo)

    async def ler_avatar_atual(self, usuario_id: UUID) -> bytes:
        usuario = await self.obter_perfil(usuario_id)
        if not usuario.avatar_arquivo:
            raise ErroDeDominio(
                codigo="RECURSO_NAO_ENCONTRADO",
                mensagem="Usuario ainda nao enviou um avatar personalizado.",
                status_http=404,
            )
        conteudo = self._avatares.ler(usuario.avatar_arquivo)
        if conteudo is None:
            raise ErroDeDominio(
                codigo="RECURSO_NAO_ENCONTRADO",
                mensagem="Arquivo de avatar nao localizado.",
                status_http=404,
            )
        return conteudo

    async def excluir_conta_definitiva(self, usuario_id: UUID, confirmacao: str) -> None:
        if confirmacao != CONFIRMACAO_EXCLUSAO_EXATA:
            raise ErroDeDominio(
                codigo="CONFIRMACAO_EXCLUSAO_INVALIDA",
                mensagem="Digite exatamente EXCLUIR para confirmar a remocao definitiva da conta.",
                status_http=409,
            )

        avatar_arquivo = await self._usuarios.excluir_definitivo(usuario_id)

        if self._limpador is not None:
            await self._limpador.remover_dados_usuario(str(usuario_id))

        if avatar_arquivo:
            self._avatares.remover(avatar_arquivo)
