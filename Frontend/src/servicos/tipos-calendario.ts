import type { PrioridadeTarefa } from '../astronomia/tipos';
import type { StatusTarefa, TurnoTarefa } from './tipos-jornada';

export interface ItemCalendarioTarefa {
  id: string;
  titulo: string;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  turno: TurnoTarefa;
  prazo: string;
  atrasada: boolean;
  recorrente: boolean;
  ehProjecao: boolean;
}

export interface DiaCalendarioResumo {
  data: string;
  totalTarefas: number;
  maiorPrioridade: PrioridadeTarefa;
  temAtrasada: boolean;
  temRecorrente: boolean;
  tarefas: ItemCalendarioTarefa[];
}

export interface CalendarioMensal {
  ano: number;
  mes: number;
  fusoHorario: string;
  dias: DiaCalendarioResumo[];
}

export interface ParametrosConsultaCalendario {
  ano: number;
  mes: number;
  fusoHorario?: string;
  prioridade?: PrioridadeTarefa | '';
  turno?: TurnoTarefa | '';
}

export interface ServicoCalendarioFrontend {
  consultarMensal(parametros: ParametrosConsultaCalendario): Promise<CalendarioMensal>;
}
