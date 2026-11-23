import { describe, expect, it, vi } from 'vitest';
import {
  CONFIGURACAO_AUDIO_PADRAO,
  calcularGanhosEfetivos,
  calcularIntensidadeChuva,
  normalizarVolume,
  obterReceitaMicroEfeito,
  obterReceitaPaisagem,
  resolverPerfilPaisagem,
} from '../../src/audio/logica-audio';
import {
  ControladorAudioLume,
  type BufferAudioMinimo,
  type ContextoAudioMinimo,
  type NoAudioMinimo,
} from '../../src/audio/motor-web-audio';

function criarFabricaAudioFake() {
  const osciladoresCriados: Array<{
    type: string;
    frequency: { value: number };
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const fontesBufferCriadas: Array<{
    loop: boolean;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const ganhosCriados: Array<{ gain: { value: number }; disconnect: ReturnType<typeof vi.fn> }> =
    [];
  const contextosCriados: Array<{
    state: 'suspended' | 'running' | 'closed';
    suspend: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }> = [];

  const conectarBasico = (): NoAudioMinimo => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  const fabrica = vi.fn((): ContextoAudioMinimo => {
    const instancia = {
      state: 'running' as 'suspended' | 'running' | 'closed',
      currentTime: 0,
      sampleRate: 44100,
      destination: conectarBasico(),
      createGain: () => {
        const g = {
          gain: {
            value: 0,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            cancelScheduledValues: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        ganhosCriados.push(g);
        return g;
      },
      createOscillator: () => {
        const osc = {
          type: 'sine',
          frequency: {
            value: 220,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null as (() => void) | null,
        };
        osciladoresCriados.push(osc);
        return osc;
      },
      createBiquadFilter: () => ({
        type: 'lowpass',
        frequency: {
          value: 400,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        Q: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createBuffer: (_canais: number, tamanho: number) => {
        const dados = new Float32Array(tamanho);
        return {
          getChannelData: () => dados,
        };
      },
      createBufferSource: () => {
        const fonte = {
          buffer: null as BufferAudioMinimo | null,
          loop: false,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        fontesBufferCriadas.push(fonte);
        return fonte;
      },
      suspend: vi.fn(() => {
        instancia.state = 'suspended';
        return Promise.resolve();
      }),
      resume: vi.fn(() => {
        instancia.state = 'running';
        return Promise.resolve();
      }),
      close: vi.fn(() => {
        instancia.state = 'closed';
        return Promise.resolve();
      }),
    };
    contextosCriados.push(instancia);
    return instancia;
  });

  return {
    fabrica,
    contextosCriados,
    osciladoresCriados,
    fontesBufferCriadas,
    ganhosCriados,
  };
}

describe('Lógica pura da experiência sonora opt-in (D15)', () => {
  it('inicia estritamente desabilitada e normaliza volumes fora de faixa', () => {
    expect(CONFIGURACAO_AUDIO_PADRAO.habilitado).toBe(false);
    expect(normalizarVolume(-0.4)).toBe(0);
    expect(normalizarVolume(1.7)).toBe(1);
    expect(normalizarVolume(Number.NaN)).toBe(0);
    expect(normalizarVolume(0.65)).toBe(0.65);
  });

  it('resolve perfil de paisagem, intensidade da chuva e ganhos efetivos com movimento reduzido e visibilidade', () => {
    expect(resolverPerfilPaisagem('manha', false)).toBe('manha');
    expect(resolverPerfilPaisagem('noite', false)).toBe('noite');
    expect(resolverPerfilPaisagem('noite', true)).toBe('foco');

    expect(calcularIntensidadeChuva('limpo')).toBe(0);
    expect(calcularIntensidadeChuva('nublado')).toBe(0);
    expect(calcularIntensidadeChuva('chuvoso')).toBeGreaterThan(0);
    expect(calcularIntensidadeChuva('tempestade')).toBeGreaterThan(
      calcularIntensidadeChuva('chuvoso'),
    );

    expect(
      calcularGanhosEfetivos(
        { habilitado: false, volumeGeral: 0.8, volumeEfeitos: 0.8, volumeAmbiente: 0.6 },
        {
          momentoDoDia: 'manha',
          estadoClimatico: 'chuvoso',
          modoFocoAtivo: false,
          abaVisivel: true,
          reduzirMovimento: false,
        },
      ),
    ).toEqual({
      ativo: false,
      ganhoMestre: 0,
      ganhoPaisagem: 0,
      ganhoChuva: 0,
      ganhoEfeitos: 0,
      trovaoPermitido: false,
    });

    const oculto = calcularGanhosEfetivos(
      { habilitado: true, volumeGeral: 0.8, volumeEfeitos: 0.8, volumeAmbiente: 0.6 },
      {
        momentoDoDia: 'tarde',
        estadoClimatico: 'tempestade',
        modoFocoAtivo: false,
        abaVisivel: false,
        reduzirMovimento: false,
      },
    );
    expect(oculto.ativo).toBe(false);
    expect(oculto.ganhoMestre).toBe(0);

    const tempestadeMovReduzido = calcularGanhosEfetivos(
      { habilitado: true, volumeGeral: 0.5, volumeEfeitos: 0.8, volumeAmbiente: 0.6 },
      {
        momentoDoDia: 'noite',
        estadoClimatico: 'tempestade',
        modoFocoAtivo: false,
        abaVisivel: true,
        reduzirMovimento: true,
      },
    );
    expect(tempestadeMovReduzido.ativo).toBe(true);
    expect(tempestadeMovReduzido.ganhoChuva).toBeGreaterThan(0);
    expect(tempestadeMovReduzido.trovaoPermitido).toBe(false);
  });

  it('expõe receitas de 5 paisagens e 7 micro-efeitos com frequências válidas', () => {
    for (const perfil of ['manha', 'tarde', 'crepusculo', 'noite', 'foco'] as const) {
      const receita = obterReceitaPaisagem(perfil);
      expect(receita.frequenciaBaseHz).toBeGreaterThan(80);
      expect(receita.frequenciaHarmonicaHz).toBeGreaterThan(receita.frequenciaBaseHz);
    }

    for (const efeito of [
      'tarefa_concluida',
      'cascata_concluida',
      'no_iluminado',
      'tarefa_reaberta',
      'foco_iniciado',
      'foco_concluido',
      'foco_interrompido',
    ] as const) {
      const notas = obterReceitaMicroEfeito(efeito);
      expect(notas.length).toBeGreaterThanOrEqual(2);
      expect(notas[0]?.frequenciaHz).toBeGreaterThan(100);
    }
  });
});

describe('ControladorAudioLume (Web Audio API)', () => {
  it('respeita opt-in, transita momento/chuva, suspende em aba oculta e libera nos ao desativar', () => {
    const fake = criarFabricaAudioFake();
    const controlador = new ControladorAudioLume(fake.fabrica);

    // Enquanto desligado, nao cria AudioContext nem toca efeitos
    controlador.atualizar(CONFIGURACAO_AUDIO_PADRAO, {
      momentoDoDia: 'manha',
      estadoClimatico: 'limpo',
      modoFocoAtivo: false,
      abaVisivel: true,
      reduzirMovimento: false,
    });
    expect(fake.fabrica).not.toHaveBeenCalled();
    expect(controlador.tocarMicroEfeito('tarefa_concluida')).toBe(false);

    // Ao ativar opt-in, inicializa AudioContext uma vez e permite efeitos
    controlador.atualizar(
      { habilitado: true, volumeGeral: 0.8, volumeEfeitos: 0.9, volumeAmbiente: 0.6 },
      {
        momentoDoDia: 'manha',
        estadoClimatico: 'limpo',
        modoFocoAtivo: false,
        abaVisivel: true,
        reduzirMovimento: false,
      },
    );
    expect(fake.fabrica).toHaveBeenCalledTimes(1);
    expect(fake.fontesBufferCriadas).toHaveLength(1);
    expect(fake.fontesBufferCriadas[0]?.loop).toBe(true);

    const oscBaseAntes = fake.osciladoresCriados.length;
    expect(controlador.tocarMicroEfeito('cascata_concluida')).toBe(true);
    expect(fake.osciladoresCriados.length).toBeGreaterThan(oscBaseAntes);

    // Transita para noite chuvosa sem recriar contexto
    controlador.atualizar(
      { habilitado: true, volumeGeral: 0.8, volumeEfeitos: 0.9, volumeAmbiente: 0.6 },
      {
        momentoDoDia: 'noite',
        estadoClimatico: 'chuvoso',
        modoFocoAtivo: false,
        abaVisivel: true,
        reduzirMovimento: false,
      },
    );
    expect(fake.fabrica).toHaveBeenCalledTimes(1);

    // Pausa ao ocultar aba e retoma ao voltar
    controlador.atualizar(
      { habilitado: true, volumeGeral: 0.8, volumeEfeitos: 0.9, volumeAmbiente: 0.6 },
      {
        momentoDoDia: 'noite',
        estadoClimatico: 'chuvoso',
        modoFocoAtivo: false,
        abaVisivel: false,
        reduzirMovimento: false,
      },
    );
    expect(fake.contextosCriados[0]?.suspend).toHaveBeenCalledTimes(1);

    controlador.atualizar(
      { habilitado: true, volumeGeral: 0.8, volumeEfeitos: 0.9, volumeAmbiente: 0.6 },
      {
        momentoDoDia: 'noite',
        estadoClimatico: 'chuvoso',
        modoFocoAtivo: false,
        abaVisivel: true,
        reduzirMovimento: false,
      },
    );
    expect(fake.contextosCriados[0]?.resume).toHaveBeenCalledTimes(1);

    // Desabilitar libera nos e fecha AudioContext
    controlador.atualizar(
      { habilitado: false, volumeGeral: 0.8, volumeEfeitos: 0.9, volumeAmbiente: 0.6 },
      {
        momentoDoDia: 'noite',
        estadoClimatico: 'chuvoso',
        modoFocoAtivo: false,
        abaVisivel: true,
        reduzirMovimento: false,
      },
    );
    expect(fake.contextosCriados[0]?.close).toHaveBeenCalledTimes(1);

    // destruir() adicional deve ser idempotente
    expect(() => controlador.destruir()).not.toThrow();
  });
});
