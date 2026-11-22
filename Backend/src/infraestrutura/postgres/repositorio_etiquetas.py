from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError

from contratos.persistencia import FabricaSessaoRelacional
from contratos.tarefas import EtiquetaRegistro
from dominio.erros import ErroDeDominio
from dominio.notas_e_etiquetas import MAX_ETIQUETAS_USUARIO
from infraestrutura.postgres.modelos import EtiquetaModelo


def _para_registro(modelo: EtiquetaModelo) -> EtiquetaRegistro:
    return EtiquetaRegistro(
        id=modelo.id,
        usuario_id=modelo.usuario_id,
        nome=modelo.nome,
        cor=modelo.cor,
        criado_em=modelo.criado_em,
    )


class RepositorioEtiquetasPostgres:
    """Adaptador SQLAlchemy para CRUD de etiquetas isoladas por usuario."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def listar(self, usuario_id: UUID) -> list[EtiquetaRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            modelos = (
                (
                    await sessao.execute(
                        select(EtiquetaModelo)
                        .where(EtiquetaModelo.usuario_id == usuario_id)
                        .order_by(EtiquetaModelo.nome_normalizado.asc())
                    )
                )
                .scalars()
                .all()
            )
            return [_para_registro(m) for m in modelos]

    async def buscar_por_ids(
        self,
        usuario_id: UUID,
        etiqueta_ids: tuple[UUID, ...],
    ) -> list[EtiquetaRegistro]:
        if not etiqueta_ids:
            return []
        async with self._fabrica.obter_sessao() as sessao:
            modelos = (
                (
                    await sessao.execute(
                        select(EtiquetaModelo)
                        .where(
                            EtiquetaModelo.usuario_id == usuario_id,
                            EtiquetaModelo.id.in_(list(etiqueta_ids)),
                        )
                        .order_by(EtiquetaModelo.nome_normalizado.asc())
                    )
                )
                .scalars()
                .all()
            )
            return [_para_registro(m) for m in modelos]

    async def criar(
        self,
        usuario_id: UUID,
        nome: str,
        nome_normalizado: str,
        cor: str,
    ) -> EtiquetaRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            total_atual = (
                await sessao.execute(
                    select(func.count())
                    .select_from(EtiquetaModelo)
                    .where(EtiquetaModelo.usuario_id == usuario_id)
                )
            ).scalar_one()
            if total_atual >= MAX_ETIQUETAS_USUARIO:
                raise ErroDeDominio(
                    codigo="LIMITE_ETIQUETAS_EXCEDIDO",
                    mensagem="Limite maximo de 30 etiquetas por conta foi atingido.",
                    status_http=422,
                    detalhes={"limite_usuario": MAX_ETIQUETAS_USUARIO},
                )

            modelo = EtiquetaModelo(
                id=uuid4(),
                usuario_id=usuario_id,
                nome=nome,
                nome_normalizado=nome_normalizado,
                cor=cor,
                criado_em=datetime.now(UTC),
            )
            sessao.add(modelo)
            try:
                await sessao.commit()
            except IntegrityError as falha:
                await sessao.rollback()
                raise ErroDeDominio(
                    codigo="ETIQUETA_DUPLICADA",
                    mensagem="Ja existe uma etiqueta com este nome na conta.",
                    status_http=409,
                ) from falha
            await sessao.refresh(modelo)
            return _para_registro(modelo)

    async def atualizar(
        self,
        usuario_id: UUID,
        etiqueta_id: UUID,
        nome: str,
        nome_normalizado: str,
        cor: str,
    ) -> EtiquetaRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = (
                await sessao.execute(
                    select(EtiquetaModelo).where(
                        EtiquetaModelo.id == etiqueta_id,
                        EtiquetaModelo.usuario_id == usuario_id,
                    )
                )
            ).scalar_one_or_none()
            if modelo is None:
                raise ErroDeDominio(
                    codigo="RECURSO_NAO_ENCONTRADO",
                    mensagem="Etiqueta nao encontrada.",
                    status_http=404,
                )

            modelo.nome = nome
            modelo.nome_normalizado = nome_normalizado
            modelo.cor = cor
            try:
                await sessao.commit()
            except IntegrityError as falha:
                await sessao.rollback()
                raise ErroDeDominio(
                    codigo="ETIQUETA_DUPLICADA",
                    mensagem="Ja existe uma etiqueta com este nome na conta.",
                    status_http=409,
                ) from falha
            await sessao.refresh(modelo)
            return _para_registro(modelo)

    async def excluir(self, usuario_id: UUID, etiqueta_id: UUID) -> bool:
        async with self._fabrica.obter_sessao() as sessao:
            removidos = (
                (
                    await sessao.execute(
                        delete(EtiquetaModelo)
                        .where(
                            EtiquetaModelo.id == etiqueta_id,
                            EtiquetaModelo.usuario_id == usuario_id,
                        )
                        .returning(EtiquetaModelo.id)
                    )
                )
                .scalars()
                .all()
            )
            await sessao.commit()
            return len(removidos) > 0
