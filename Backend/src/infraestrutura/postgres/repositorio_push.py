from collections.abc import Sequence
from datetime import UTC, datetime
from typing import cast
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select, update

from contratos.persistencia import FabricaSessaoRelacional
from contratos.push import (
    InscricaoPushRegistro,
    LembretePendenteDisparo,
    LembreteTarefaRegistro,
)
from dominio.push import PlataformaPush, StatusLembrete
from infraestrutura.postgres.modelos import (
    InscricaoPushModelo,
    LembreteTarefaModelo,
    TarefaModelo,
)
from infraestrutura.postgres.repositorio_tarefas import _resolver_raiz_autorizada


def _para_inscricao_registro(modelo: InscricaoPushModelo) -> InscricaoPushRegistro:
    return InscricaoPushRegistro(
        id=modelo.id,
        usuario_id=modelo.usuario_id,
        endpoint=modelo.endpoint,
        chave_p256dh=modelo.chave_p256dh,
        chave_auth=modelo.chave_auth,
        rotulo_dispositivo=modelo.rotulo_dispositivo,
        plataforma=cast(PlataformaPush, modelo.plataforma),
        criado_em=modelo.criado_em,
        ultimo_envio_em=modelo.ultimo_envio_em,
    )


def _para_lembrete_registro(modelo: LembreteTarefaModelo) -> LembreteTarefaRegistro:
    return LembreteTarefaRegistro(
        id=modelo.id,
        usuario_id=modelo.usuario_id,
        tarefa_id=modelo.tarefa_id,
        disparar_em=modelo.disparar_em,
        antecedencia_min=modelo.antecedencia_min,
        status=cast(StatusLembrete, modelo.status),
        enviado_em=modelo.enviado_em,
        criado_em=modelo.criado_em,
    )


class RepositorioPushPostgres:
    """Adaptador PostgreSQL para inscricoes Web Push e lembretes de tarefas."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def listar_inscricoes_usuario(self, usuario_id: UUID) -> list[InscricaoPushRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            modelos = (
                (
                    await sessao.execute(
                        select(InscricaoPushModelo)
                        .where(InscricaoPushModelo.usuario_id == usuario_id)
                        .order_by(InscricaoPushModelo.criado_em.desc())
                    )
                )
                .scalars()
                .all()
            )
            return [_para_inscricao_registro(m) for m in modelos]

    async def listar_inscricoes_por_usuarios(
        self, usuario_ids: Sequence[UUID]
    ) -> list[InscricaoPushRegistro]:
        if not usuario_ids:
            return []
        async with self._fabrica.obter_sessao() as sessao:
            modelos = (
                (
                    await sessao.execute(
                        select(InscricaoPushModelo).where(
                            InscricaoPushModelo.usuario_id.in_(list(usuario_ids))
                        )
                    )
                )
                .scalars()
                .all()
            )
            return [_para_inscricao_registro(m) for m in modelos]

    async def obter_inscricao_por_endpoint(self, endpoint: str) -> InscricaoPushRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = (
                await sessao.execute(
                    select(InscricaoPushModelo).where(InscricaoPushModelo.endpoint == endpoint)
                )
            ).scalar_one_or_none()
            return _para_inscricao_registro(modelo) if modelo is not None else None

    async def registrar_ou_atualizar_inscricao(
        self,
        *,
        usuario_id: UUID,
        endpoint: str,
        chave_p256dh: str,
        chave_auth: str,
        rotulo_dispositivo: str,
        plataforma: PlataformaPush,
    ) -> InscricaoPushRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            existente = (
                await sessao.execute(
                    select(InscricaoPushModelo).where(InscricaoPushModelo.endpoint == endpoint)
                )
            ).scalar_one_or_none()
            if existente is not None:
                existente.usuario_id = usuario_id
                existente.chave_p256dh = chave_p256dh
                existente.chave_auth = chave_auth
                existente.rotulo_dispositivo = rotulo_dispositivo
                existente.plataforma = plataforma
                await sessao.commit()
                await sessao.refresh(existente)
                return _para_inscricao_registro(existente)

            nova = InscricaoPushModelo(
                id=uuid4(),
                usuario_id=usuario_id,
                endpoint=endpoint,
                chave_p256dh=chave_p256dh,
                chave_auth=chave_auth,
                rotulo_dispositivo=rotulo_dispositivo,
                plataforma=plataforma,
                criado_em=datetime.now(UTC),
                ultimo_envio_em=None,
            )
            sessao.add(nova)
            await sessao.commit()
            await sessao.refresh(nova)
            return _para_inscricao_registro(nova)

    async def revogar_inscricao(self, usuario_id: UUID, dispositivo_id: UUID) -> bool:
        async with self._fabrica.obter_sessao() as sessao:
            res = await sessao.execute(
                delete(InscricaoPushModelo).where(
                    InscricaoPushModelo.id == dispositivo_id,
                    InscricaoPushModelo.usuario_id == usuario_id,
                )
            )
            await sessao.commit()
            return int(getattr(res, "rowcount", 0) or 0) > 0

    async def remover_inscricoes_por_ids(self, inscricao_ids: Sequence[UUID]) -> int:
        if not inscricao_ids:
            return 0
        async with self._fabrica.obter_sessao() as sessao:
            res = await sessao.execute(
                delete(InscricaoPushModelo).where(InscricaoPushModelo.id.in_(list(inscricao_ids)))
            )
            await sessao.commit()
            return int(getattr(res, "rowcount", 0) or 0)

    async def atualizar_ultimo_envio_inscricoes(
        self, inscricao_ids: Sequence[UUID], instante: datetime
    ) -> None:
        if not inscricao_ids:
            return
        async with self._fabrica.obter_sessao() as sessao:
            await sessao.execute(
                update(InscricaoPushModelo)
                .where(InscricaoPushModelo.id.in_(list(inscricao_ids)))
                .values(ultimo_envio_em=instante)
            )
            await sessao.commit()

    async def verificar_acesso_tarefa(self, usuario_id: UUID, tarefa_id: UUID) -> bool:
        async with self._fabrica.obter_sessao() as sessao:
            autorizado = await _resolver_raiz_autorizada(sessao, usuario_id, tarefa_id)
            return autorizado is not None

    async def listar_lembretes_tarefa(
        self, usuario_id: UUID, tarefa_id: UUID
    ) -> list[LembreteTarefaRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            modelos = (
                (
                    await sessao.execute(
                        select(LembreteTarefaModelo)
                        .where(
                            LembreteTarefaModelo.usuario_id == usuario_id,
                            LembreteTarefaModelo.tarefa_id == tarefa_id,
                            LembreteTarefaModelo.status != "cancelado",
                        )
                        .order_by(LembreteTarefaModelo.disparar_em.asc())
                    )
                )
                .scalars()
                .all()
            )
            return [_para_lembrete_registro(m) for m in modelos]

    async def contar_lembretes_pendentes_tarefa(self, usuario_id: UUID, tarefa_id: UUID) -> int:
        async with self._fabrica.obter_sessao() as sessao:
            qtd = (
                await sessao.execute(
                    select(func.count(LembreteTarefaModelo.id)).where(
                        LembreteTarefaModelo.usuario_id == usuario_id,
                        LembreteTarefaModelo.tarefa_id == tarefa_id,
                        LembreteTarefaModelo.status == "pendente",
                    )
                )
            ).scalar_one()
            return int(qtd)

    async def criar_lembrete(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        disparar_em: datetime,
        antecedencia_min: int,
    ) -> LembreteTarefaRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            novo = LembreteTarefaModelo(
                id=uuid4(),
                usuario_id=usuario_id,
                tarefa_id=tarefa_id,
                disparar_em=disparar_em,
                antecedencia_min=antecedencia_min,
                status="pendente",
                enviado_em=None,
                criado_em=datetime.now(UTC),
            )
            sessao.add(novo)
            await sessao.commit()
            await sessao.refresh(novo)
            return _para_lembrete_registro(novo)

    async def atualizar_lembrete(
        self,
        *,
        usuario_id: UUID,
        lembrete_id: UUID,
        disparar_em: datetime | None,
        antecedencia_min: int | None,
    ) -> LembreteTarefaRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            modelo = (
                await sessao.execute(
                    select(LembreteTarefaModelo).where(
                        LembreteTarefaModelo.id == lembrete_id,
                        LembreteTarefaModelo.usuario_id == usuario_id,
                        LembreteTarefaModelo.status == "pendente",
                    )
                )
            ).scalar_one_or_none()
            if modelo is None:
                return None
            if disparar_em is not None:
                modelo.disparar_em = disparar_em
            if antecedencia_min is not None:
                modelo.antecedencia_min = antecedencia_min
            await sessao.commit()
            await sessao.refresh(modelo)
            return _para_lembrete_registro(modelo)

    async def cancelar_lembrete(self, usuario_id: UUID, lembrete_id: UUID) -> bool:
        async with self._fabrica.obter_sessao() as sessao:
            res = await sessao.execute(
                update(LembreteTarefaModelo)
                .where(
                    LembreteTarefaModelo.id == lembrete_id,
                    LembreteTarefaModelo.usuario_id == usuario_id,
                    LembreteTarefaModelo.status == "pendente",
                )
                .values(status="cancelado")
            )
            await sessao.commit()
            return int(getattr(res, "rowcount", 0) or 0) > 0

    async def listar_lembretes_pendentes_vencidos(
        self, agora: datetime
    ) -> list[LembretePendenteDisparo]:
        async with self._fabrica.obter_sessao() as sessao:
            linhas = (
                await sessao.execute(
                    select(LembreteTarefaModelo, TarefaModelo.titulo)
                    .join(TarefaModelo, TarefaModelo.id == LembreteTarefaModelo.tarefa_id)
                    .where(
                        LembreteTarefaModelo.status == "pendente",
                        LembreteTarefaModelo.disparar_em <= agora,
                        TarefaModelo.status != "concluida",
                    )
                    .order_by(LembreteTarefaModelo.disparar_em.asc())
                )
            ).all()
            return [
                LembretePendenteDisparo(
                    id=lem.id,
                    usuario_id=lem.usuario_id,
                    tarefa_id=lem.tarefa_id,
                    titulo_tarefa=titulo,
                    disparar_em=lem.disparar_em,
                    antecedencia_min=lem.antecedencia_min,
                )
                for lem, titulo in linhas
            ]

    async def marcar_lembretes_enviados(
        self, lembrete_ids: Sequence[UUID], instante: datetime
    ) -> None:
        if not lembrete_ids:
            return
        async with self._fabrica.obter_sessao() as sessao:
            await sessao.execute(
                update(LembreteTarefaModelo)
                .where(LembreteTarefaModelo.id.in_(list(lembrete_ids)))
                .values(status="enviado", enviado_em=instante)
            )
            await sessao.commit()
