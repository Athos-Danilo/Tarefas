from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select

from contratos.autenticacao import IdentidadeGoogle, RegistroUsuario
from contratos.persistencia import FabricaSessaoRelacional
from dominio.erros import ErroDeDominio
from infraestrutura.postgres.modelos import TarefaModelo, UsuarioModelo


def _para_registro(modelo: UsuarioModelo) -> RegistroUsuario:
    return RegistroUsuario(
        id=modelo.id,
        google_sub=modelo.google_sub,
        email=modelo.email,
        nome_exibicao=modelo.nome_exibicao,
        avatar_tipo=modelo.avatar_tipo,
        avatar_id=modelo.avatar_id,
        foto_google_url=modelo.foto_google_url,
        avatar_arquivo=modelo.avatar_arquivo,
        primeiro_acesso_concluido=modelo.primeiro_acesso_concluido,
        atualizado_em=modelo.atualizado_em,
    )


class RepositorioUsuariosPostgres:
    """Repositorio SQLAlchemy para contas e criacao atomica da arvore-guia."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def buscar_por_id(self, usuario_id: UUID) -> RegistroUsuario | None:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = await sessao.get(UsuarioModelo, usuario_id)
            return _para_registro(modelo) if modelo is not None else None

    async def buscar_ou_criar_por_google(
        self,
        identidade: IdentidadeGoogle,
    ) -> RegistroUsuario:
        async with self._fabrica.obter_sessao() as sessao:
            existente = (
                await sessao.execute(
                    select(UsuarioModelo).where(UsuarioModelo.google_sub == identidade.google_sub)
                )
            ).scalar_one_or_none()

            if existente is not None:
                existente.email = identidade.email
                existente.foto_google_url = identidade.foto_url
                existente.atualizado_em = datetime.now(UTC)
                await sessao.commit()
                await sessao.refresh(existente)
                return _para_registro(existente)

            nome_inicial = identidade.nome_sugerido.strip()[:60]
            if len(nome_inicial) < 2:
                nome_inicial = "Pessoa Usuaria"

            avatar_tipo_inicial = "google" if identidade.foto_url else "preset"
            avatar_id_inicial = None if identidade.foto_url else "sol-nascente"

            novo = UsuarioModelo(
                id=uuid4(),
                google_sub=identidade.google_sub,
                email=identidade.email,
                nome_exibicao=nome_inicial,
                avatar_tipo=avatar_tipo_inicial,
                avatar_id=avatar_id_inicial,
                foto_google_url=identidade.foto_url,
                primeiro_acesso_concluido=False,
            )
            sessao.add(novo)
            await sessao.commit()
            await sessao.refresh(novo)
            return _para_registro(novo)

    async def concluir_primeiro_acesso(
        self,
        usuario_id: UUID,
        nome_exibicao: str,
        avatar_tipo: str,
        avatar_id: str | None,
        criar_arvore_guia: bool,
    ) -> tuple[RegistroUsuario, UUID | None]:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = await sessao.get(UsuarioModelo, usuario_id)
            if modelo is None:
                raise ErroDeDominio(
                    codigo="NAO_AUTENTICADO",
                    mensagem="Usuario nao localizado.",
                    status_http=401,
                )

            ja_concluiu = modelo.primeiro_acesso_concluido
            modelo.nome_exibicao = nome_exibicao
            modelo.avatar_tipo = avatar_tipo
            modelo.avatar_id = avatar_id
            modelo.primeiro_acesso_concluido = True
            modelo.atualizado_em = datetime.now(UTC)

            tarefa_guia_id: UUID | None = None
            if criar_arvore_guia and not ja_concluiu:
                tarefa_guia_id = uuid4()
                raiz = TarefaModelo(
                    id=tarefa_guia_id,
                    usuario_id=usuario_id,
                    tarefa_pai_id=None,
                    titulo="Primeiros passos no Lume",
                    prioridade="media",
                    status="em_andamento",
                    turno="manha",
                    profundidade=1,
                    ordem_manual=1,
                )
                sessao.add(raiz)
                await sessao.flush()

                sessao.add_all(
                    [
                        TarefaModelo(
                            id=uuid4(),
                            usuario_id=usuario_id,
                            tarefa_pai_id=tarefa_guia_id,
                            titulo="Explorar o ciclo do dia e o mapa de constelacao",
                            prioridade="media",
                            status="pendente",
                            turno="manha",
                            profundidade=2,
                            ordem_manual=1,
                        ),
                        TarefaModelo(
                            id=uuid4(),
                            usuario_id=usuario_id,
                            tarefa_pai_id=tarefa_guia_id,
                            titulo="Organizar suas prioridades da semana",
                            prioridade="alta",
                            status="pendente",
                            turno="tarde",
                            profundidade=2,
                            ordem_manual=2,
                        ),
                    ]
                )

            await sessao.commit()
            await sessao.refresh(modelo)
            return _para_registro(modelo), tarefa_guia_id

    async def atualizar_perfil(
        self,
        usuario_id: UUID,
        nome_exibicao: str,
        avatar_tipo: str,
        avatar_id: str | None,
    ) -> RegistroUsuario:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = await sessao.get(UsuarioModelo, usuario_id)
            if modelo is None:
                raise ErroDeDominio(
                    codigo="NAO_AUTENTICADO",
                    mensagem="Usuario nao encontrado.",
                    status_http=401,
                )
            modelo.nome_exibicao = nome_exibicao
            modelo.avatar_tipo = avatar_tipo
            modelo.avatar_id = avatar_id
            modelo.atualizado_em = datetime.now(UTC)
            await sessao.commit()
            await sessao.refresh(modelo)
            return _para_registro(modelo)

    async def registrar_arquivo_avatar(
        self,
        usuario_id: UUID,
        nome_arquivo: str,
    ) -> RegistroUsuario:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = await sessao.get(UsuarioModelo, usuario_id)
            if modelo is None:
                raise ErroDeDominio(
                    codigo="NAO_AUTENTICADO",
                    mensagem="Usuario nao encontrado.",
                    status_http=401,
                )
            modelo.avatar_tipo = "upload"
            modelo.avatar_id = None
            modelo.avatar_arquivo = nome_arquivo
            modelo.atualizado_em = datetime.now(UTC)
            await sessao.commit()
            await sessao.refresh(modelo)
            return _para_registro(modelo)

    async def excluir_definitivo(self, usuario_id: UUID) -> str | None:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = await sessao.get(UsuarioModelo, usuario_id)
            if modelo is None:
                return None
            avatar_arquivo = modelo.avatar_arquivo
            await sessao.delete(modelo)
            await sessao.commit()
            return avatar_arquivo
