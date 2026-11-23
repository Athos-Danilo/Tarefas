import {
  CONFIGURACAO_AUDIO_PADRAO,
  type ConfiguracaoAudio,
  type ContextoSonoroAtual,
  type TipoMicroEfeito,
  calcularGanhosEfetivos,
  obterReceitaMicroEfeito,
  obterReceitaPaisagem,
  resolverPerfilPaisagem,
} from './logica-audio';

export interface ParametroAudioMinimo {
  value: number;
  setValueAtTime?: (valor: number, instante: number) => void;
  linearRampToValueAtTime?: (valor: number, instanteFim: number) => void;
}

export interface NoAudioMinimo {
  connect: (destino: NoAudioMinimo) => void;
  disconnect: () => void;
}

export interface GanhoAudioMinimo extends NoAudioMinimo {
  gain: ParametroAudioMinimo;
}

export interface OsciladorAudioMinimo extends NoAudioMinimo {
  type: string;
  frequency: ParametroAudioMinimo;
  start: (instante?: number) => void;
  stop: (instante?: number) => void;
  onended: (() => void) | null;
}

export interface FiltroBiquadAudioMinimo extends NoAudioMinimo {
  type: string;
  frequency: ParametroAudioMinimo;
  Q: { value: number };
}

export interface BufferAudioMinimo {
  getChannelData: (canal: number) => Float32Array;
}

export interface FonteBufferAudioMinimo extends NoAudioMinimo {
  buffer: BufferAudioMinimo | null;
  loop: boolean;
  start: (instante?: number) => void;
  stop: (instante?: number) => void;
}

export interface ContextoAudioMinimo {
  readonly state: string;
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: NoAudioMinimo;
  createGain: () => GanhoAudioMinimo;
  createOscillator: () => OsciladorAudioMinimo;
  createBiquadFilter: () => FiltroBiquadAudioMinimo;
  createBuffer: (canais: number, tamanho: number, taxaAmostragem: number) => BufferAudioMinimo;
  createBufferSource: () => FonteBufferAudioMinimo;
  suspend: () => Promise<void>;
  resume: () => Promise<void>;
  close: () => Promise<void>;
}

export type FabricaContextoAudio = () => ContextoAudioMinimo;

interface JanelaComWebkitAudio extends Window {
  webkitAudioContext?: new () => ContextoAudioMinimo;
}

export function criarFabricaAudioNavegador(): FabricaContextoAudio | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (typeof window.AudioContext === 'function') {
    return () => new window.AudioContext() as unknown as ContextoAudioMinimo;
  }
  const janelaEstendida = window as JanelaComWebkitAudio;
  const WebkitAudio = janelaEstendida.webkitAudioContext;
  if (typeof WebkitAudio === 'function') {
    return () => new WebkitAudio();
  }
  return null;
}

interface CadeiaAtivaAudio {
  contexto: ContextoAudioMinimo;
  ganhoMestre: GanhoAudioMinimo;
  ganhoPaisagem: GanhoAudioMinimo;
  ganhoChuva: GanhoAudioMinimo;
  ganhoEfeitos: GanhoAudioMinimo;
  oscBase: OsciladorAudioMinimo;
  oscHarmonico: OsciladorAudioMinimo;
  filtroPaisagem: FiltroBiquadAudioMinimo;
  fonteChuva: FonteBufferAudioMinimo;
  filtroChuva: FiltroBiquadAudioMinimo;
}

function definirParametroSuave(param: ParametroAudioMinimo, valor: number, agora: number): void {
  if (typeof param.linearRampToValueAtTime === 'function') {
    param.linearRampToValueAtTime(valor, agora + 0.18);
  }
  param.value = valor;
}

function preencherRuidoRosaSuave(dados: Float32Array): void {
  let semente = 20261123;
  let filtro = 0;
  for (let i = 0; i < dados.length; i += 1) {
    semente = (semente * 1664525 + 1013904223) >>> 0;
    const branco = (semente / 0xffffffff) * 2 - 1;
    filtro = (filtro + 0.03 * branco) / 1.03;
    dados[i] = filtro * 2.2;
  }
}

export class ControladorAudioLume {
  private readonly _fabrica: FabricaContextoAudio | null;
  private _cadeia: CadeiaAtivaAudio | null = null;
  private _configAtual: ConfiguracaoAudio = CONFIGURACAO_AUDIO_PADRAO;
  private _ganhoEfeitosAtual = 0;

  constructor(fabrica: FabricaContextoAudio | null = criarFabricaAudioNavegador()) {
    this._fabrica = fabrica;
  }

  atualizar(config: ConfiguracaoAudio, contextoSonoro: ContextoSonoroAtual): void {
    this._configAtual = config;

    if (!config.habilitado) {
      this._ganhoEfeitosAtual = 0;
      this._desativar();
      return;
    }

    const cadeia = this._garantirCadeia();
    if (!cadeia) {
      return;
    }

    const ganhos = calcularGanhosEfetivos(config, contextoSonoro);
    this._ganhoEfeitosAtual = ganhos.ganhoEfeitos;

    const agora = cadeia.contexto.currentTime;
    const perfil = resolverPerfilPaisagem(
      contextoSonoro.momentoDoDia,
      contextoSonoro.modoFocoAtivo,
    );
    const receita = obterReceitaPaisagem(perfil);

    definirParametroSuave(cadeia.oscBase.frequency, receita.frequenciaBaseHz, agora);
    definirParametroSuave(cadeia.oscHarmonico.frequency, receita.frequenciaHarmonicaHz, agora);
    definirParametroSuave(cadeia.filtroPaisagem.frequency, receita.corteFiltroHz, agora);

    definirParametroSuave(cadeia.ganhoMestre.gain, ganhos.ganhoMestre, agora);
    definirParametroSuave(
      cadeia.ganhoPaisagem.gain,
      ganhos.ganhoPaisagem * receita.ganhoRelativo,
      agora,
    );
    definirParametroSuave(cadeia.ganhoChuva.gain, ganhos.ganhoChuva, agora);
    definirParametroSuave(cadeia.ganhoEfeitos.gain, ganhos.ganhoEfeitos, agora);

    if (!contextoSonoro.abaVisivel) {
      if (cadeia.contexto.state === 'running') {
        void cadeia.contexto.suspend().catch(() => undefined);
      }
    } else if (cadeia.contexto.state === 'suspended') {
      void cadeia.contexto.resume().catch(() => undefined);
    }
  }

  tocarMicroEfeito(efeito: TipoMicroEfeito): boolean {
    if (!this._configAtual.habilitado || !this._cadeia || this._ganhoEfeitosAtual <= 0) {
      return false;
    }

    const { contexto, ganhoEfeitos } = this._cadeia;
    if (contexto.state === 'closed') {
      return false;
    }
    if (contexto.state === 'suspended') {
      void contexto.resume().catch(() => undefined);
    }

    const notas = obterReceitaMicroEfeito(efeito);
    const baseTempo = contexto.currentTime;

    for (const nota of notas) {
      const osc = contexto.createOscillator();
      const envoltorio = contexto.createGain();
      osc.type = nota.tipo;
      osc.frequency.value = nota.frequenciaHz;

      const inicio = baseTempo + nota.atrasoSeg;
      const fim = inicio + nota.duracaoSeg;
      const pico = Math.max(0.01, nota.ganhoRelativo);

      if (typeof envoltorio.gain.setValueAtTime === 'function') {
        envoltorio.gain.setValueAtTime(0.001, inicio);
      }
      if (typeof envoltorio.gain.linearRampToValueAtTime === 'function') {
        envoltorio.gain.linearRampToValueAtTime(pico, inicio + 0.02);
        envoltorio.gain.linearRampToValueAtTime(0.0001, fim);
      } else {
        envoltorio.gain.value = pico;
      }

      osc.connect(envoltorio);
      envoltorio.connect(ganhoEfeitos);
      osc.onended = () => {
        try {
          osc.disconnect();
          envoltorio.disconnect();
        } catch {
          // Ignora se ja desconectado ao fechar contexto.
        }
      };

      osc.start(inicio);
      osc.stop(fim + 0.02);
    }

    return true;
  }

  destruir(): void {
    this._ganhoEfeitosAtual = 0;
    this._desativar();
  }

  private _garantirCadeia(): CadeiaAtivaAudio | null {
    if (this._cadeia) {
      return this._cadeia;
    }
    if (!this._fabrica) {
      return null;
    }

    const contexto = this._fabrica();
    const ganhoMestre = contexto.createGain();
    const ganhoPaisagem = contexto.createGain();
    const ganhoChuva = contexto.createGain();
    const ganhoEfeitos = contexto.createGain();

    ganhoMestre.gain.value = 0;
    ganhoPaisagem.gain.value = 0;
    ganhoChuva.gain.value = 0;
    ganhoEfeitos.gain.value = 0;

    ganhoPaisagem.connect(ganhoMestre);
    ganhoChuva.connect(ganhoMestre);
    ganhoEfeitos.connect(ganhoMestre);
    ganhoMestre.connect(contexto.destination);

    const filtroPaisagem = contexto.createBiquadFilter();
    filtroPaisagem.type = 'lowpass';
    filtroPaisagem.frequency.value = 420;
    filtroPaisagem.Q.value = 0.7;
    filtroPaisagem.connect(ganhoPaisagem);

    const oscBase = contexto.createOscillator();
    oscBase.type = 'sine';
    oscBase.frequency.value = 220;
    oscBase.connect(filtroPaisagem);
    oscBase.start();

    const oscHarmonico = contexto.createOscillator();
    oscHarmonico.type = 'triangle';
    oscHarmonico.frequency.value = 330;
    oscHarmonico.connect(filtroPaisagem);
    oscHarmonico.start();

    const tamanhoBuffer = Math.max(256, Math.round((contexto.sampleRate || 44100) * 2));
    const bufferChuva = contexto.createBuffer(1, tamanhoBuffer, contexto.sampleRate || 44100);
    preencherRuidoRosaSuave(bufferChuva.getChannelData(0));

    const filtroChuva = contexto.createBiquadFilter();
    filtroChuva.type = 'bandpass';
    filtroChuva.frequency.value = 950;
    filtroChuva.Q.value = 0.8;
    filtroChuva.connect(ganhoChuva);

    const fonteChuva = contexto.createBufferSource();
    fonteChuva.buffer = bufferChuva;
    fonteChuva.loop = true;
    fonteChuva.connect(filtroChuva);
    fonteChuva.start();

    this._cadeia = {
      contexto,
      ganhoMestre,
      ganhoPaisagem,
      ganhoChuva,
      ganhoEfeitos,
      oscBase,
      oscHarmonico,
      filtroPaisagem,
      fonteChuva,
      filtroChuva,
    };
    return this._cadeia;
  }

  private _desativar(): void {
    const cadeia = this._cadeia;
    if (!cadeia) {
      return;
    }
    this._cadeia = null;

    const acoesSeguras = [
      () => cadeia.oscBase.stop(),
      () => cadeia.oscHarmonico.stop(),
      () => cadeia.fonteChuva.stop(),
      () => cadeia.oscBase.disconnect(),
      () => cadeia.oscHarmonico.disconnect(),
      () => cadeia.filtroPaisagem.disconnect(),
      () => cadeia.fonteChuva.disconnect(),
      () => cadeia.filtroChuva.disconnect(),
      () => cadeia.ganhoPaisagem.disconnect(),
      () => cadeia.ganhoChuva.disconnect(),
      () => cadeia.ganhoEfeitos.disconnect(),
      () => cadeia.ganhoMestre.disconnect(),
    ];
    for (const executar of acoesSeguras) {
      try {
        executar();
      } catch {
        // Alguns nos ja podem ter sido encerrados.
      }
    }
    if (cadeia.contexto.state !== 'closed') {
      void cadeia.contexto.close().catch(() => undefined);
    }
  }
}
