from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, bindparam, or_, select, text

from contratos.calendario import RepositorioCalendario
from contratos.persistencia import FabricaSessaoRelacional
from contratos.tarefas import TarefaRegistro
from dominio.modelos_tarefa import PrioridadeTarefa, TurnoTarefa
from infraestrutura.postgres.modelos import MembroTarefaModelo, TarefaModelo
from infraestrutura.postgres.repositorio_tarefas import hidratar_tarefas_lista


class RepositorioCalendarioPostgres(RepositorioCalendario):
    """Consulta PostgreSQL otimizada por janela mensal para o Calendario de Prazos."""

    def __init__(self, fabrica: FabricaSessaoRelacional) -> None:
        self._fabrica = fabrica

    async def listar_tarefas_para_janela(
        self,
        usuario_id: UUID,
        *,
        inicio_utc: datetime,
        fim_exclusivo_utc: datetime,
        prioridade: PrioridadeTarefa | None = None,
        turno: TurnoTarefa | None = None,
    ) -> list[TarefaRegistro]:
        async with self._fabrica.obter_sessao() as sessao:
            raizes_membro = list(
                (
                    await sessao.execute(
                        select(MembroTarefaModelo.tarefa_raiz_id).where(
                            MembroTarefaModelo.usuario_id == usuario_id
                        )
                    )
                )
                .scalars()
                .all()
            )

            ids_compartilhados: list[UUID] = []
            if raizes_membro:
                cte_comp = text(
                    """
                    WITH RECURSIVE compartilhadas AS (
                        SELECT id
                        FROM tarefas
                        WHERE id IN :raizes
                        UNION ALL
                        SELECT t.id
                        FROM tarefas t
                        INNER JOIN compartilhadas c ON t.tarefa_pai_id = c.id
                    )
                    SELECT id FROM compartilhadas
                    """
                ).bindparams(bindparam("raizes", expanding=True))
                ids_compartilhados = list(
                    (await sessao.execute(cte_comp, {"raizes": raizes_membro})).scalars().all()
                )

            dono_ou_membro = (
                or_(TarefaModelo.usuario_id == usuario_id, TarefaModelo.id.in_(ids_compartilhados))
                if ids_compartilhados
                else TarefaModelo.usuario_id == usuario_id
            )

            condicoes = [
                dono_ou_membro,
                TarefaModelo.prazo.is_not(None),
                or_(
                    and_(
                        TarefaModelo.prazo >= inicio_utc,
                        TarefaModelo.prazo < fim_exclusivo_utc,
                    ),
                    and_(
                        TarefaModelo.recorrencia_tipo != "nenhuma",
                        TarefaModelo.status != "concluida",
                        TarefaModelo.prazo < fim_exclusivo_utc,
                    ),
                ),
            ]

            if prioridade is not None:
                condicoes.append(TarefaModelo.prioridade == prioridade)
            if turno is not None:
                condicoes.append(TarefaModelo.turno == turno)

            modelos = (
                (
                    await sessao.execute(
                        select(TarefaModelo)
                        .where(*condicoes)
                        .order_by(TarefaModelo.prazo.asc(), TarefaModelo.titulo.asc())
                    )
                )
                .scalars()
                .all()
            )
            return await hidratar_tarefas_lista(sessao, usuario_id, modelos)
