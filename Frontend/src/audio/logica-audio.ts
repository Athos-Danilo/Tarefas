import type { EstadoClimatico, MomentoDoDia } from '../astronomia/tipos';

export type TipoMicroEfeito =
  | 'tarefa_concluida'
  | 'cascata_concluida'
  | 'no_iluminado'
  | 'tarefa_reaberta'
  | 'foco_iniciado'
  | 'foco_concluido'
  | 'foco_interrompido';

export type PerfilPaisagemSonora = MomentoDoDia | 'foco';

export interface ConfiguracaoAudio {
  habilitado: boolean;
  volumeGeral: number;
  volumeEfeitos: number;
  volumeAmbiente: number;
}

export interface ContextoSonoroAtual {
  momentoDoDia: MomentoDoDia;
  estadoClimatico: EstadoClimatico;
  modoFocoAtivo: boolean;
  abaVisivel: boolean;
  reduzirMovimento: boolean;
}

export interface GanhosEfetivosAudio {
  ativo: boolean;
  ganhoMestre: number;
  ganhoPaisagem: number;
  ganhoChuva: number;
  ganhoEfeitos: number;
  trovaoPermitido: boolean;
}

export interface ReceitaPaisagemSonora {
  frequenciaBaseHz: number;
  frequenciaHarmonicaHz: number;
  corteFiltroHz: number;
  ganhoRelativo: number;
}

export interface NotaMicroEfeito {
  frequenciaHz: number;
  atrasoSeg: number;
  duracaoSeg: number;
  tipo: 'sine' | 'triangle';
  ganhoRelativo: number;
}

export const CONFIGURACAO_AUDIO_PADRAO: ConfiguracaoAudio = {
  habilitado: false,
  volumeGeral: 0.7,
  volumeEfeitos: 0.8,
  volumeAmbiente: 0.5,
};

export function normalizarVolume(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 0;
  }
  return Math.round(Math.min(1, Math.max(0, valor)) * 100) / 100;
}

export function resolverPerfilPaisagem(
  momentoDoDia: MomentoDoDia,
  modoFocoAtivo: boolean,
): PerfilPaisagemSonora {
  return modoFocoAtivo ? 'foco' : momentoDoDia;
}

export function calcularIntensidadeChuva(estadoClimatico: EstadoClimatico): number {
  if (estadoClimatico === 'chuvoso') {
    return 0.45;
  }
  if (estadoClimatico === 'tempestade') {
    return 0.85;
  }
  return 0;
}

export function calcularGanhosEfetivos(
  config: ConfiguracaoAudio,
  contexto: ContextoSonoroAtual,
): GanhosEfetivosAudio {
  if (!config.habilitado || !contexto.abaVisivel) {
    return {
      ativo: false,
      ganhoMestre: 0,
      ganhoPaisagem: 0,
      ganhoChuva: 0,
      ganhoEfeitos: 0,
      trovaoPermitido: false,
    };
  }

  const geral = normalizarVolume(config.volumeGeral);
  const ambiente = normalizarVolume(config.volumeAmbiente);
  const efeitos = normalizarVolume(config.volumeEfeitos);
  const intensidadeChuva = calcularIntensidadeChuva(contexto.estadoClimatico);

  return {
    ativo: true,
    ganhoMestre: geral,
    ganhoPaisagem: Math.round(ambiente * 0.14 * 1000) / 1000,
    ganhoChuva: Math.round(ambiente * intensidadeChuva * 0.22 * 1000) / 1000,
    ganhoEfeitos: Math.round(efeitos * 0.26 * 1000) / 1000,
    trovaoPermitido: contexto.estadoClimatico === 'tempestade' && !contexto.reduzirMovimento,
  };
}

const RECEITAS_PAISAGEM: Record<PerfilPaisagemSonora, ReceitaPaisagemSonora> = {
  manha: {
    frequenciaBaseHz: 220,
    frequenciaHarmonicaHz: 330,
    corteFiltroHz: 460,
    ganhoRelativo: 0.9,
  },
  tarde: {
    frequenciaBaseHz: 246.94,
    frequenciaHarmonicaHz: 370,
    corteFiltroHz: 520,
    ganhoRelativo: 0.85,
  },
  crepusculo: {
    frequenciaBaseHz: 174.61,
    frequenciaHarmonicaHz: 261.63,
    corteFiltroHz: 360,
    ganhoRelativo: 0.95,
  },
  noite: {
    frequenciaBaseHz: 130.81,
    frequenciaHarmonicaHz: 196,
    corteFiltroHz: 290,
    ganhoRelativo: 0.8,
  },
  foco: {
    frequenciaBaseHz: 146.83,
    frequenciaHarmonicaHz: 220,
    corteFiltroHz: 320,
    ganhoRelativo: 0.75,
  },
};

export function obterReceitaPaisagem(perfil: PerfilPaisagemSonora): ReceitaPaisagemSonora {
  return RECEITAS_PAISAGEM[perfil];
}

const RECEITAS_EFEITOS: Record<TipoMicroEfeito, readonly NotaMicroEfeito[]> = {
  tarefa_concluida: [
    { frequenciaHz: 523.25, atrasoSeg: 0, duracaoSeg: 0.11, tipo: 'sine', ganhoRelativo: 0.85 },
    { frequenciaHz: 783.99, atrasoSeg: 0.08, duracaoSeg: 0.16, tipo: 'sine', ganhoRelativo: 1.0 },
  ],
  cascata_concluida: [
    { frequenciaHz: 523.25, atrasoSeg: 0, duracaoSeg: 0.1, tipo: 'sine', ganhoRelativo: 0.75 },
    { frequenciaHz: 659.25, atrasoSeg: 0.07, duracaoSeg: 0.1, tipo: 'sine', ganhoRelativo: 0.85 },
    { frequenciaHz: 783.99, atrasoSeg: 0.14, duracaoSeg: 0.12, tipo: 'sine', ganhoRelativo: 0.95 },
    {
      frequenciaHz: 1046.5,
      atrasoSeg: 0.22,
      duracaoSeg: 0.2,
      tipo: 'triangle',
      ganhoRelativo: 1.0,
    },
  ],
  no_iluminado: [
    { frequenciaHz: 783.99, atrasoSeg: 0, duracaoSeg: 0.09, tipo: 'sine', ganhoRelativo: 0.8 },
    { frequenciaHz: 987.77, atrasoSeg: 0.07, duracaoSeg: 0.15, tipo: 'sine', ganhoRelativo: 0.95 },
  ],
  tarefa_reaberta: [
    { frequenciaHz: 392, atrasoSeg: 0, duracaoSeg: 0.09, tipo: 'triangle', ganhoRelativo: 0.7 },
    { frequenciaHz: 293.66, atrasoSeg: 0.07, duracaoSeg: 0.12, tipo: 'sine', ganhoRelativo: 0.65 },
  ],
  foco_iniciado: [
    { frequenciaHz: 293.66, atrasoSeg: 0, duracaoSeg: 0.14, tipo: 'sine', ganhoRelativo: 0.85 },
    { frequenciaHz: 440, atrasoSeg: 0.1, duracaoSeg: 0.22, tipo: 'sine', ganhoRelativo: 0.9 },
  ],
  foco_concluido: [
    { frequenciaHz: 523.25, atrasoSeg: 0, duracaoSeg: 0.14, tipo: 'sine', ganhoRelativo: 0.8 },
    { frequenciaHz: 783.99, atrasoSeg: 0.11, duracaoSeg: 0.16, tipo: 'sine', ganhoRelativo: 0.9 },
    { frequenciaHz: 1046.5, atrasoSeg: 0.22, duracaoSeg: 0.25, tipo: 'sine', ganhoRelativo: 1.0 },
  ],
  foco_interrompido: [
    { frequenciaHz: 329.63, atrasoSeg: 0, duracaoSeg: 0.11, tipo: 'triangle', ganhoRelativo: 0.7 },
    { frequenciaHz: 261.63, atrasoSeg: 0.09, duracaoSeg: 0.16, tipo: 'sine', ganhoRelativo: 0.6 },
  ],
};

export function obterReceitaMicroEfeito(efeito: TipoMicroEfeito): readonly NotaMicroEfeito[] {
  return RECEITAS_EFEITOS[efeito];
}
