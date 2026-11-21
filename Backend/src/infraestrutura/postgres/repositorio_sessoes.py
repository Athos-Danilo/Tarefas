from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import select, update

from contratos.autenticacao import RegistroSessao
from contratos.persistencia import FabricaSessaoRelacional
from infraestrutura.postgres.modelos import SessaoModelo


def _para_registro(modelo: SessaoModelo) -> RegistroSessao:
    return RegistroSessao(
        id=modelo.id,
        usuario_id=modelo.usuario_id,
        token_hash=modelo.token_hash,
        csrf_token_hash=modelo.csrf_token_hash,
        expira_em=modelo.expira_em,
        expiracao_absoluta_em=modelo.expiracao_absoluta_em,
        criado_em=modelo.criado_em,
        revogada_em=modelo.revogada_em,
    )


class RepositorioSessoesPostgres:
    """Repositorio SQLAlchemy para sessoes server-side e revogacao."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def criar(
        self,
        usuario_id: UUID,
        token_hash: str,
        csrf_token_hash: str,
        expira_em: datetime,
        expiracao_absoluta_em: datetime,
    ) -> RegistroSessao:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = SessaoModelo(
                id=uuid4(),
                usuario_id=usuario_id,
                token_hash=token_hash,
                csrf_token_hash=csrf_token_hash,
                expira_em=expira_em,
                expiracao_absoluta_em=expiracao_absoluta_em,
            )
            sessao.add(modelo)
            await sessao.commit()
            await sessao.refresh(modelo)
            return _para_registro(modelo)

    async def buscar_ativa_por_token_hash(
        self,
        token_hash: str,
        agora: datetime,
    ) -> RegistroSessao | None:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = (
                await sessao.execute(
                    select(SessaoModelo).where(
                        SessaoModelo.token_hash == token_hash,
                        SessaoModelo.revogada_em.is_(None),
                        SessaoModelo.expira_em > agora,
                        SessaoModelo.expiracao_absoluta_em > agora,
                    )
                )
            ).scalar_one_or_none()
            return _para_registro(modelo) if modelo is not None else None

    async def atualizar_expiracao(self, sessao_id: UUID, nova_expiracao: datetime) -> None:
        async with self._fabrica.obter_sessao() as sessao:
            await sessao.execute(
                update(SessaoModelo)
                .where(SessaoModelo.id == sessao_id)
                .values(expira_em=nova_expiracao)
            )
            await sessao.commit()

    async def revogar_por_id(self, sessao_id: UUID, revogada_em: datetime) -> None:
        async with self._fabrica.obter_sessao() as sessao:
            await sessao.execute(
                update(SessaoModelo)
                .where(SessaoModelo.id == sessao_id, SessaoModelo.revogada_em.is_(None))
                .values(revogada_em=revogada_em)
            )
            await sessao.commit()

    async def revogar_todas_do_usuario(self, usuario_id: UUID, revogada_em: datetime) -> int:
        async with self._fabrica.obter_sessao() as sessao:
            resultado = await sessao.execute(
                update(SessaoModelo)
                .where(SessaoModelo.usuario_id == usuario_id, SessaoModelo.revogada_em.is_(None))
                .values(revogada_em=revogada_em)
                .returning(SessaoModelo.id)
            )
            ids_revogados = resultado.scalars().all()
            await sessao.commit()
            return len(ids_revogados)
