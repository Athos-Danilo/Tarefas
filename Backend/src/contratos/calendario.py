from datetime import datetime
from typing import Protocol
from uuid import UUID

from contratos.tarefas import TarefaRegistro
from dominio.modelos_tarefa import PrioridadeTarefa, TurnoTarefa


class RepositorioCalendario(Protocol):
    """Porta de consulta otimizada de tarefas com prazo para o calendario mensal."""

    async def listar_tarefas_para_janela(
        self,
        usuario_id: UUID,
        *,
        inicio_utc: datetime,
        fim_exclusivo_utc: datetime,
        prioridade: PrioridadeTarefa | None = None,
        turno: TurnoTarefa | None = None,
    ) -> list[TarefaRegistro]: ...
