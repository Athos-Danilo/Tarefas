from datetime import datetime
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from contratos.foco import RepositorioSessoesFoco, SessaoFocoRegistro
from contratos.persistencia import FabricaSessaoRelacional
from dominio.erros import ErroDeDominio
from dominio.foco import StatusSessaoFoco
from infraestrutura.postgres.modelos import SessaoFocoModelo, TarefaModelo


def _para_registro(modelo: SessaoFocoModelo, titulo_tarefa: str) -> SessaoFocoRegistro:
    return SessaoFocoRegistro(
        id=modelo.id,
        usuario_id=modelo.usuario_id,
        tarefa_id=modelo.tarefa_id,
        tarefa_titulo=titulo_tarefa,
        duracao_planejada_seg=modelo.duracao_planejada_seg,
        duracao_real_seg=modelo.duracao_real_seg,
        iniciada_em=modelo.iniciada_em,
        encerrada_em=modelo.encerrada_em,
        status=cast(StatusSessaoFoco, modelo.status),
    )


class RepositorioSessoesFocoPostgres(RepositorioSessoesFoco):
    """Adaptador PostgreSQL para sessoes_foco com unicidade de sessao ativa."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def obter_ativa(self, usuario_id: UUID) -> SessaoFocoRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            linha = (
                await sessao.execute(
                    select(SessaoFocoModelo, TarefaModelo.titulo)
                    .join(TarefaModelo, TarefaModelo.id == SessaoFocoModelo.tarefa_id)
                    .where(
                        SessaoFocoModelo.usuario_id == usuario_id,
                        SessaoFocoModelo.status == "em_andamento",
                    )
                    .order_by(SessaoFocoModelo.iniciada_em.desc())
                    .limit(1)
                )
            ).first()
            if linha is None:
                return None
            return _para_registro(linha[0], str(linha[1]))

    async def obter_por_id(
        self,
        usuario_id: UUID,
        sessao_id: UUID,
    ) -> SessaoFocoRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            linha = (
                await sessao.execute(
                    select(SessaoFocoModelo, TarefaModelo.titulo)
                    .join(TarefaModelo, TarefaModelo.id == SessaoFocoModelo.tarefa_id)
                    .where(
                        SessaoFocoModelo.id == sessao_id,
                        SessaoFocoModelo.usuario_id == usuario_id,
                    )
                    .limit(1)
                )
            ).first()
            if linha is None:
                return None
            return _para_registro(linha[0], str(linha[1]))

    async def criar(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        duracao_planejada_seg: int,
        iniciada_em: datetime,
    ) -> SessaoFocoRegistro:
        async with self._fabrica.obter_sessao() as sessao:
            titulo = (
                await sessao.execute(
                    select(TarefaModelo.titulo).where(TarefaModelo.id == tarefa_id).limit(1)
                )
            ).scalar_one_or_none()
            if titulo is None:
                raise ErroDeDominio(
                    codigo="TAREFA_NAO_ENCONTRADA",
                    mensagem="Tarefa nao encontrada para iniciar o Modo Foco.",
                    status_http=404,
                )

            modelo = SessaoFocoModelo(
                usuario_id=usuario_id,
                tarefa_id=tarefa_id,
                duracao_planejada_seg=duracao_planejada_seg,
                duracao_real_seg=None,
                iniciada_em=iniciada_em,
                encerrada_em=None,
                status="em_andamento",
            )
            sessao.add(modelo)
            try:
                await sessao.commit()
                await sessao.refresh(modelo)
            except IntegrityError as falha:
                await sessao.rollback()
                raise ErroDeDominio(
                    codigo="SESSAO_FOCO_JA_ATIVA",
                    mensagem="Ja existe uma sessao de foco em andamento para este usuario.",
                    status_http=409,
                ) from falha

            return _para_registro(modelo, str(titulo))

    async def encerrar(
        self,
        *,
        usuario_id: UUID,
        sessao_id: UUID,
        status: StatusSessaoFoco,
        duracao_real_seg: int,
        encerrada_em: datetime,
    ) -> SessaoFocoRegistro | None:
        async with self._fabrica.obter_sessao() as sessao:
            linha = (
                await sessao.execute(
                    select(SessaoFocoModelo, TarefaModelo.titulo)
                    .join(TarefaModelo, TarefaModelo.id == SessaoFocoModelo.tarefa_id)
                    .where(
                        SessaoFocoModelo.id == sessao_id,
                        SessaoFocoModelo.usuario_id == usuario_id,
                    )
                    .limit(1)
                )
            ).first()
            if linha is None:
                return None

            modelo = linha[0]
            titulo = str(linha[1])
            modelo.status = status
            modelo.duracao_real_seg = duracao_real_seg
            modelo.encerrada_em = encerrada_em
            await sessao.commit()
            await sessao.refresh(modelo)
            return _para_registro(modelo, titulo)

    async def listar_historico(
        self,
        usuario_id: UUID,
        limite: int,
    ) -> list[SessaoFocoRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            linhas = (
                await sessao.execute(
                    select(SessaoFocoModelo, TarefaModelo.titulo)
                    .join(TarefaModelo, TarefaModelo.id == SessaoFocoModelo.tarefa_id)
                    .where(SessaoFocoModelo.usuario_id == usuario_id)
                    .order_by(SessaoFocoModelo.iniciada_em.desc())
                    .limit(limite)
                )
            ).all()
            return [_para_registro(modelo, str(titulo)) for modelo, titulo in linhas]

    async def listar_todas_do_usuario(
        self,
        usuario_id: UUID,
    ) -> list[SessaoFocoRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            linhas = (
                await sessao.execute(
                    select(SessaoFocoModelo, TarefaModelo.titulo)
                    .join(TarefaModelo, TarefaModelo.id == SessaoFocoModelo.tarefa_id)
                    .where(SessaoFocoModelo.usuario_id == usuario_id)
                    .order_by(SessaoFocoModelo.iniciada_em.desc())
                )
            ).all()
            return [_para_registro(modelo, str(titulo)) for modelo, titulo in linhas]
