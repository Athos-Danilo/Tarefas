export type EstadoClimatico =
  'limpo' | 'parcialmente_nublado' | 'nublado' | 'chuvoso' | 'tempestade';

export type ClimaSimulado = 'automatico' | EstadoClimatico;

export type MomentoDoDia = 'manha' | 'tarde' | 'crepusculo' | 'noite';

export type FaixaFavicon = 'manha' | 'tarde' | 'entardecer' | 'noite';

export type PolaridadeTema = 'clara' | 'escura';

export type ModoTemporal = 'relogio_real' | 'simulador';

export type Qualidade3D = 'auto' | 'alto' | 'desempenho_2d';

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'urgente';
