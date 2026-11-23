import { create } from 'zustand';
import {
  CONFIGURACAO_AUDIO_PADRAO,
  type ConfiguracaoAudio,
  type ContextoSonoroAtual,
  type TipoMicroEfeito,
  normalizarVolume,
} from './logica-audio';
import {
  ControladorAudioLume,
  type FabricaContextoAudio,
  criarFabricaAudioNavegador,
} from './motor-web-audio';

export interface EstadoAudioLume extends ConfiguracaoAudio {
  ultimoEfeito: TipoMicroEfeito | null;
  contadorEfeitos: number;
  aplicarPreferenciasAudio: (audio: ConfiguracaoAudio) => void;
  definirHabilitado: (habilitado: boolean) => void;
  definirVolumes: (parcial: Partial<Omit<ConfiguracaoAudio, 'habilitado'>>) => void;
  tocarEfeito: (efeito: TipoMicroEfeito) => boolean;
  sincronizarAmbiente: (contexto: ContextoSonoroAtual) => void;
  encerrarAudio: () => void;
  resetarAudioParaTeste: () => void;
}

let fabricaSobrescritaTeste: FabricaContextoAudio | null = null;
let controladorAtivo: ControladorAudioLume | null = null;

function obterControlador(): ControladorAudioLume {
  if (!controladorAtivo) {
    controladorAtivo = new ControladorAudioLume(
      fabricaSobrescritaTeste ?? criarFabricaAudioNavegador(),
    );
  }
  return controladorAtivo;
}

export function definirFabricaAudioParaTeste(fabrica: FabricaContextoAudio | null): void {
  fabricaSobrescritaTeste = fabrica;
  controladorAtivo?.destruir();
  controladorAtivo = null;
}

export const useEstadoAudio = create<EstadoAudioLume>((set, get) => ({
  ...CONFIGURACAO_AUDIO_PADRAO,
  ultimoEfeito: null,
  contadorEfeitos: 0,

  aplicarPreferenciasAudio: (audio) =>
    set({
      habilitado: Boolean(audio.habilitado),
      volumeGeral: normalizarVolume(audio.volumeGeral),
      volumeEfeitos: normalizarVolume(audio.volumeEfeitos),
      volumeAmbiente: normalizarVolume(audio.volumeAmbiente),
    }),

  definirHabilitado: (habilitado) => set({ habilitado }),

  definirVolumes: (parcial) =>
    set((atual) => ({
      volumeGeral:
        parcial.volumeGeral !== undefined
          ? normalizarVolume(parcial.volumeGeral)
          : atual.volumeGeral,
      volumeEfeitos:
        parcial.volumeEfeitos !== undefined
          ? normalizarVolume(parcial.volumeEfeitos)
          : atual.volumeEfeitos,
      volumeAmbiente:
        parcial.volumeAmbiente !== undefined
          ? normalizarVolume(parcial.volumeAmbiente)
          : atual.volumeAmbiente,
    })),

  tocarEfeito: (efeito) => {
    const atual = get();
    if (!atual.habilitado) {
      return false;
    }
    const tocou = obterControlador().tocarMicroEfeito(efeito);
    if (tocou) {
      set((estado) => ({
        ultimoEfeito: efeito,
        contadorEfeitos: estado.contadorEfeitos + 1,
      }));
    }
    return tocou;
  },

  sincronizarAmbiente: (contexto) => {
    const atual = get();
    if (!atual.habilitado && !controladorAtivo) {
      return;
    }
    obterControlador().atualizar(
      {
        habilitado: atual.habilitado,
        volumeGeral: atual.volumeGeral,
        volumeEfeitos: atual.volumeEfeitos,
        volumeAmbiente: atual.volumeAmbiente,
      },
      contexto,
    );
  },

  encerrarAudio: () => {
    controladorAtivo?.destruir();
    controladorAtivo = null;
  },

  resetarAudioParaTeste: () => {
    controladorAtivo?.destruir();
    controladorAtivo = null;
    set({
      ...CONFIGURACAO_AUDIO_PADRAO,
      ultimoEfeito: null,
      contadorEfeitos: 0,
    });
  },
}));
