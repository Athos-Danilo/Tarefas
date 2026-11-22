import type { PosicaoAstros } from '../astronomia/ciclo-solar';
import type { DadosFaseLunar } from '../astronomia/fase-lunar';
import type { EstadoCromatico24h } from '../astronomia/sistema-cromatico';
import type { EstadoClimatico } from '../astronomia/tipos';

export type NomePerfilDesempenho3D = 'desktop_riqueza_maxima' | 'mobile_adaptado';

export interface PerfilDesempenho3D {
  perfil: NomePerfilDesempenho3D;
  dpr: [number, number];
  sombrasAtivas: boolean;
  segmentosTerreno: number;
  quantidadeArbustos: number;
  quantidadeFlores: number;
  quantidadeVagalumes: number;
  quantidadeEstrelas: number;
  maxGotasChuva: number;
  maxNuvens: number;
  tetoTriangulos: number;
  triangulosEstimados: number;
}

export interface ParametrosClima3D {
  estadoClimatico: EstadoClimatico;
  quantidadeNuvens: number;
  opacidadeNuvens: number;
  corNuvem: string;
  escurecimentoCeu: number;
  quantidadeGotas: number;
  velocidadeChuva: number;
  intensidadeRelampagoMax: number;
}

export interface EntradaCena3D {
  cromatico: EstadoCromatico24h;
  astros: PosicaoAstros;
  faseLunar: DadosFaseLunar;
  estadoClimatico: EstadoClimatico;
  progressoTarefas: number;
  reduzirMovimento: boolean;
  perfil: PerfilDesempenho3D;
}

export interface ParametrosCena3D {
  posicaoSol: [number, number, number];
  posicaoLua: [number, number, number];
  vetorLuzLunar: [number, number, number];
  corLuzAmbiente: string;
  intensidadeLuzAmbiente: number;
  corLuzDirecional: string;
  intensidadeLuzDirecional: number;
  corHemisferioCeu: string;
  corHemisferioSolo: string;
  intensidadeHemisferio: number;
  escalaFlorescimento: number;
  brilhoConstelacoes: number;
  opacidadeVagalumes: number;
  clima: ParametrosClima3D;
}

export interface PropriedadesCena3D {
  cromatico: EstadoCromatico24h;
  astros: PosicaoAstros;
  faseLunar: DadosFaseLunar;
  estadoClimatico: EstadoClimatico;
  reduzirMovimento: boolean;
  progressoTarefas: number;
  perfil: PerfilDesempenho3D;
  aoPerderContextoWebGL: () => void;
}

export const CAMERA_REPOUSO_3D: readonly [number, number, number] = [0, 3.1, 13.5];

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function criarGeradorDeterministico(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let mistura = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    mistura = (mistura + Math.imul(mistura ^ (mistura >>> 7), 61 | mistura)) ^ mistura;
    return ((mistura ^ (mistura >>> 14)) >>> 0) / 4294967296;
  };
}

export function calcularPerfilDesempenho3D(larguraViewport: number): PerfilDesempenho3D {
  const desktop = larguraViewport >= 768;

  if (desktop) {
    const segmentosTerreno = 64;
    const quantidadeArbustos = 44;
    const quantidadeFlores = 64;
    const quantidadeVagalumes = 90;
    const maxGotasChuva = 320;
    const maxNuvens = 11;

    const triangulosCeuEAstros = 768 + 3072;
    const triangulosTerreno = 3 * segmentosTerreno * 16 * 2;
    const triangulosVegetacao = quantidadeArbustos * 320 + quantidadeFlores * 180;
    const triangulosClimaEVagalumes =
      maxNuvens * 4 * 280 + maxGotasChuva * 20 + quantidadeVagalumes * 8;

    return {
      perfil: 'desktop_riqueza_maxima',
      dpr: [1, 2],
      sombrasAtivas: true,
      segmentosTerreno,
      quantidadeArbustos,
      quantidadeFlores,
      quantidadeVagalumes,
      quantidadeEstrelas: 420,
      maxGotasChuva,
      maxNuvens,
      tetoTriangulos: 70000,
      triangulosEstimados:
        triangulosCeuEAstros + triangulosTerreno + triangulosVegetacao + triangulosClimaEVagalumes,
    };
  }

  const segmentosTerreno = 36;
  const quantidadeArbustos = 20;
  const quantidadeFlores = 28;
  const quantidadeVagalumes = 36;
  const maxGotasChuva = 120;
  const maxNuvens = 6;

  const triangulosCeuEAstros = 768 + 3072;
  const triangulosTerreno = 3 * segmentosTerreno * 16 * 2;
  const triangulosVegetacao = quantidadeArbustos * 80 + quantidadeFlores * 180;
  const triangulosClimaEVagalumes =
    maxNuvens * 4 * 280 + maxGotasChuva * 20 + quantidadeVagalumes * 8;

  return {
    perfil: 'mobile_adaptado',
    dpr: [1, 1.25],
    sombrasAtivas: false,
    segmentosTerreno,
    quantidadeArbustos,
    quantidadeFlores,
    quantidadeVagalumes,
    quantidadeEstrelas: 180,
    maxGotasChuva,
    maxNuvens,
    tetoTriangulos: 28000,
    triangulosEstimados:
      triangulosCeuEAstros + triangulosTerreno + triangulosVegetacao + triangulosClimaEVagalumes,
  };
}

export function calcularVetorLuzFaseLunar(dadosFase: DadosFaseLunar): [number, number, number] {
  const angulo = dadosFase.fracaoCiclo * Math.PI * 2;
  const sinalX = dadosFase.hemisferio === 'sul' ? -1 : 1;
  const lx = Number((sinalX * Math.sin(angulo)).toFixed(6));
  const ly = 0;
  const lz = Number((-Math.cos(angulo)).toFixed(6));
  return [lx, ly, lz];
}

export function calcularParametrosClima3D(
  estadoClimatico: EstadoClimatico,
  perfil: PerfilDesempenho3D,
  reduzirMovimento: boolean,
): ParametrosClima3D {
  switch (estadoClimatico) {
    case 'limpo':
      return {
        estadoClimatico,
        quantidadeNuvens: 0,
        opacidadeNuvens: 0,
        corNuvem: '#F8FAFC',
        escurecimentoCeu: 0,
        quantidadeGotas: 0,
        velocidadeChuva: 0,
        intensidadeRelampagoMax: 0,
      };
    case 'parcialmente_nublado':
      return {
        estadoClimatico,
        quantidadeNuvens: Math.max(2, Math.round(perfil.maxNuvens * 0.4)),
        opacidadeNuvens: 0.78,
        corNuvem: '#F1F5F9',
        escurecimentoCeu: 0.1,
        quantidadeGotas: 0,
        velocidadeChuva: 0,
        intensidadeRelampagoMax: 0,
      };
    case 'nublado':
      return {
        estadoClimatico,
        quantidadeNuvens: Math.max(4, Math.round(perfil.maxNuvens * 0.8)),
        opacidadeNuvens: 0.9,
        corNuvem: '#CBD5E1',
        escurecimentoCeu: 0.24,
        quantidadeGotas: 0,
        velocidadeChuva: 0,
        intensidadeRelampagoMax: 0,
      };
    case 'chuvoso':
      return {
        estadoClimatico,
        quantidadeNuvens: perfil.maxNuvens,
        opacidadeNuvens: 0.94,
        corNuvem: '#94A3B8',
        escurecimentoCeu: 0.34,
        quantidadeGotas: Math.round(perfil.maxGotasChuva * 0.65),
        velocidadeChuva: 17,
        intensidadeRelampagoMax: 0,
      };
    case 'tempestade':
      return {
        estadoClimatico,
        quantidadeNuvens: perfil.maxNuvens,
        opacidadeNuvens: 0.96,
        corNuvem: '#64748B',
        escurecimentoCeu: 0.48,
        quantidadeGotas: perfil.maxGotasChuva,
        velocidadeChuva: 24,
        intensidadeRelampagoMax: reduzirMovimento ? 0 : 2.6,
      };
  }
}

export function calcularAlvoParalaxeCamera(
  ponteiroX: number,
  ponteiroY: number,
  reduzirMovimento: boolean,
): [number, number, number] {
  if (reduzirMovimento) {
    return [CAMERA_REPOUSO_3D[0], CAMERA_REPOUSO_3D[1], CAMERA_REPOUSO_3D[2]];
  }
  const px = limitar(ponteiroX, -1, 1);
  const py = limitar(ponteiroY, -1, 1);
  return [
    Number((px * 0.75).toFixed(4)),
    Number((CAMERA_REPOUSO_3D[1] + -py * 0.32).toFixed(4)),
    CAMERA_REPOUSO_3D[2],
  ];
}

export function calcularParametrosCena3D({
  cromatico,
  astros,
  faseLunar,
  estadoClimatico,
  progressoTarefas,
  reduzirMovimento,
  perfil,
}: EntradaCena3D): ParametrosCena3D {
  const progresso = limitar(progressoTarefas, 0, 1);
  const clima = calcularParametrosClima3D(estadoClimatico, perfil, reduzirMovimento);
  const fatorEscuroClima = 1 - clima.escurecimentoCeu * 0.45;

  const solX = Number(((astros.progressoSol - 0.5) * 28).toFixed(2));
  const solY = Number((1.5 + Math.sin(astros.progressoSol * Math.PI) * 11.5).toFixed(2));
  const luaX = Number(((astros.progressoLua - 0.5) * 26).toFixed(2));
  const luaY = Number((2.2 + Math.sin(astros.progressoLua * Math.PI) * 10.2).toFixed(2));

  const claridadeDia = astros.solVisivel
    ? 0.55 + Math.sin(astros.progressoSol * Math.PI) * 0.45
    : 0;
  const intensidadeLuzDirecional = Number(
    ((astros.solVisivel ? 0.9 + claridadeDia * 1.1 : 0.45) * fatorEscuroClima).toFixed(3),
  );
  const intensidadeLuzAmbiente = Number(
    ((cromatico.polaridade === 'clara' ? 0.62 : 0.34) * fatorEscuroClima).toFixed(3),
  );

  const brilhoConstelacoes = Number(
    (cromatico.opacidadeEstrelas * (0.35 + progresso * 0.65)).toFixed(3),
  );
  const opacidadeVagalumes = astros.solVisivel
    ? 0
    : Number((0.45 + cromatico.opacidadeEstrelas * (0.25 + progresso * 0.3)).toFixed(3));

  return {
    posicaoSol: [solX, astros.solVisivel ? solY : -12, -26],
    posicaoLua: [luaX, astros.luaVisivel ? luaY : -12, -25],
    vetorLuzLunar: calcularVetorLuzFaseLunar(faseLunar),
    corLuzAmbiente: cromatico.ceuMeio,
    intensidadeLuzAmbiente,
    corLuzDirecional: astros.solVisivel ? cromatico.astro : '#DCE7FF',
    intensidadeLuzDirecional,
    corHemisferioCeu: cromatico.ceuTopo,
    corHemisferioSolo: cromatico.colina1,
    intensidadeHemisferio: cromatico.polaridade === 'clara' ? 0.72 : 0.42,
    escalaFlorescimento: Number((0.55 + progresso * 0.45).toFixed(3)),
    brilhoConstelacoes,
    opacidadeVagalumes,
    clima,
  };
}
