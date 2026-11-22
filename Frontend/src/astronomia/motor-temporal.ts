import { create } from 'zustand';
import { normalizarMinutoDoDia, obterMinutoDeData } from './ciclo-solar';
import type {
  ClimaSimulado,
  EstadoClimatico,
  ModoTemporal,
  MomentoDoDia,
  Qualidade3D,
} from './tipos';

export const MINUTO_PADRAO_MOMENTO: Record<MomentoDoDia, number> = {
  manha: 510,
  tarde: 900,
  crepusculo: 1065,
  noite: 1290,
};

export interface EstadoMotorTemporal {
  modoTemporal: ModoTemporal;
  minutoReal: number;
  minutoSimulado: number;
  timelapseAtivo: boolean;
  velocidadeTimelapse: number;
  estadoClimaticoReal: EstadoClimatico;
  climaSimulado: ClimaSimulado;
  qualidade3D: Qualidade3D;
  movimentoReduzido: boolean;
  definirMinutoReal: (minuto: number) => void;
  definirMinutoSimulado: (minuto: number) => void;
  avancarMinutoSimulado: (deltaMinutos: number) => void;
  selecionarMomento: (momento: MomentoDoDia) => void;
  ativarRelogioReal: () => void;
  alternarTimelapse: (ativo?: boolean) => void;
  definirClimaSimulado: (clima: ClimaSimulado) => void;
  definirEstadoClimaticoReal: (clima: EstadoClimatico) => void;
  definirQualidade3D: (qualidade: Qualidade3D) => void;
  definirMovimentoReduzido: (reduzido: boolean) => void;
}

export const useMotorTemporal = create<EstadoMotorTemporal>((set) => ({
  modoTemporal: 'relogio_real',
  minutoReal: obterMinutoDeData(new Date()),
  minutoSimulado: MINUTO_PADRAO_MOMENTO.manha,
  timelapseAtivo: false,
  velocidadeTimelapse: 2,
  estadoClimaticoReal: 'limpo',
  climaSimulado: 'automatico',
  qualidade3D: 'auto',
  movimentoReduzido: false,

  definirMinutoReal: (minuto) =>
    set({
      minutoReal: normalizarMinutoDoDia(minuto),
    }),

  definirMinutoSimulado: (minuto) =>
    set({
      modoTemporal: 'simulador',
      minutoSimulado: normalizarMinutoDoDia(minuto),
    }),

  avancarMinutoSimulado: (deltaMinutos) =>
    set((atual) => ({
      modoTemporal: 'simulador',
      minutoSimulado: normalizarMinutoDoDia(atual.minutoSimulado + deltaMinutos),
    })),

  selecionarMomento: (momento) =>
    set({
      modoTemporal: 'simulador',
      timelapseAtivo: false,
      minutoSimulado: MINUTO_PADRAO_MOMENTO[momento],
    }),

  ativarRelogioReal: () =>
    set({
      modoTemporal: 'relogio_real',
      timelapseAtivo: false,
      minutoReal: obterMinutoDeData(new Date()),
    }),

  alternarTimelapse: (ativo) =>
    set((atual) => {
      const proximo = ativo ?? !atual.timelapseAtivo;
      return {
        timelapseAtivo: proximo,
        modoTemporal: proximo ? 'simulador' : atual.modoTemporal,
      };
    }),

  definirClimaSimulado: (climaSimulado) => set({ climaSimulado }),

  definirEstadoClimaticoReal: (estadoClimaticoReal) => set({ estadoClimaticoReal }),

  definirQualidade3D: (qualidade3D) => set({ qualidade3D }),

  definirMovimentoReduzido: (movimentoReduzido) => set({ movimentoReduzido }),
}));

export function obterMinutoAtivo(estado: EstadoMotorTemporal): number {
  return estado.modoTemporal === 'relogio_real' ? estado.minutoReal : estado.minutoSimulado;
}

export function obterEstadoClimaticoEfetivo(estado: EstadoMotorTemporal): EstadoClimatico {
  return estado.climaSimulado === 'automatico' ? estado.estadoClimaticoReal : estado.climaSimulado;
}
