import type { PrioridadeTarefa } from '../astronomia/tipos';
import { requisitarJson } from './cliente-http';
import type {
  CalendarioMensal,
  ParametrosConsultaCalendario,
  ServicoCalendarioFrontend,
} from './tipos-calendario';
import type { StatusTarefa, TurnoTarefa } from './tipos-jornada';

interface ItemCalendarioApi {
  id: string;
  titulo: string;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  turno: TurnoTarefa;
  prazo: string;
  atrasada: boolean;
  recorrente: boolean;
  eh_projecao: boolean;
}

interface DiaCalendarioApi {
  data: string;
  total_tarefas: number;
  maior_prioridade: PrioridadeTarefa;
  tem_atrasada: boolean;
  tem_recorrente: boolean;
  tarefas: ItemCalendarioApi[];
}

interface RespostaCalendarioMensalApi {
  ano: number;
  mes: number;
  fuso_horario: string;
  dias: DiaCalendarioApi[];
}

export function criarServicoCalendario(
  funcaoFetch: typeof fetch = fetch,
): ServicoCalendarioFrontend {
  return {
    async consultarMensal(parametros: ParametrosConsultaCalendario): Promise<CalendarioMensal> {
      const busca = new URLSearchParams({
        ano: String(parametros.ano),
        mes: String(parametros.mes),
      });
      if (parametros.fusoHorario) {
        busca.set('fuso_horario', parametros.fusoHorario);
      }
      if (parametros.prioridade) {
        busca.set('prioridade', parametros.prioridade);
      }
      if (parametros.turno) {
        busca.set('turno', parametros.turno);
      }

      const bruto = await requisitarJson<RespostaCalendarioMensalApi>(
        `/api/calendario/mensal?${busca.toString()}`,
        { method: 'GET' },
        funcaoFetch,
      );

      return {
        ano: bruto.ano,
        mes: bruto.mes,
        fusoHorario: bruto.fuso_horario,
        dias: bruto.dias.map((dia) => ({
          data: dia.data,
          totalTarefas: dia.total_tarefas,
          maiorPrioridade: dia.maior_prioridade,
          temAtrasada: dia.tem_atrasada,
          temRecorrente: dia.tem_recorrente,
          tarefas: dia.tarefas.map((item) => ({
            id: item.id,
            titulo: item.titulo,
            prioridade: item.prioridade,
            status: item.status,
            turno: item.turno,
            prazo: item.prazo,
            atrasada: item.atrasada,
            recorrente: item.recorrente,
            ehProjecao: item.eh_projecao,
          })),
        })),
      };
    },
  };
}
