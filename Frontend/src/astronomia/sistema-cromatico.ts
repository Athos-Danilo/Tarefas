import { normalizarMinutoDoDia } from './ciclo-solar';
import type { PolaridadeTema } from './tipos';

interface KeyframeCeu {
  min: number;
  nome: string;
  c1: string;
  c2: string;
  c3: string;
  col1: string;
  col2: string;
  col3: string;
  astro: string;
  est: number;
}

interface KeyframeUi {
  min: number;
  solida: string;
  alt: string;
  txt: string;
  sec: string;
  pri: string;
  priTxt: string;
  secCor: string;
  b: string;
  m: string;
  al: string;
  u: string;
}

export interface EstadoCromatico24h {
  minuto: number;
  nomeMomento: string;
  polaridade: PolaridadeTema;
  ceuTopo: string;
  ceuMeio: string;
  ceuBase: string;
  colina1: string;
  colina2: string;
  colina3: string;
  astro: string;
  opacidadeEstrelas: number;
  superficie: string;
  superficieSolida: string;
  superficieAlt: string;
  borda: string;
  texto: string;
  textoSec: string;
  primaria: string;
  primariaTexto: string;
  secundaria: string;
  sucesso: string;
  erro: string;
  prioBaixa: string;
  prioMedia: string;
  prioAlta: string;
  prioUrgente: string;
}

const CEU_KEYS: ReadonlyArray<KeyframeCeu> = [
  {
    min: 0,
    nome: 'Meia-noite Estelar',
    c1: '#070C1A',
    c2: '#0D1730',
    c3: '#132040',
    col1: '#091124',
    col2: '#101D38',
    col3: '#1A2C4D',
    astro: '#F7E8B5',
    est: 1.0,
  },
  {
    min: 285,
    nome: 'Madrugada Profunda',
    c1: '#0C1229',
    c2: '#182144',
    c3: '#262D52',
    col1: '#0D152E',
    col2: '#172245',
    col3: '#253159',
    astro: '#F7E8B5',
    est: 0.95,
  },
  {
    min: 345,
    nome: 'Aurora Rosada',
    c1: '#5C5E96',
    c2: '#E79B9B',
    c3: '#FCE2C4',
    col1: '#354949',
    col2: '#55736A',
    col3: '#7FA18C',
    astro: '#FFAE63',
    est: 0.3,
  },
  {
    min: 450,
    nome: 'Manhã Orvalhada',
    c1: '#B5DFF8',
    c2: '#E2F2F8',
    c3: '#F7F1E1',
    col1: '#256B4E',
    col2: '#467C62',
    col3: '#6DA488',
    astro: '#F9B84A',
    est: 0.0,
  },
  {
    min: 630,
    nome: 'Manhã Plena',
    c1: '#87C8F2',
    c2: '#CDEAFB',
    c3: '#F3F4EA',
    col1: '#23664C',
    col2: '#457D63',
    col3: '#6BA68A',
    astro: '#FFD166',
    est: 0.0,
  },
  {
    min: 810,
    nome: 'Zênite Luminoso',
    c1: '#5EB3E6',
    c2: '#B4DFF4',
    c3: '#F7E8C8',
    col1: '#2B6148',
    col2: '#4D7D63',
    col3: '#74A386',
    astro: '#FFB703',
    est: 0.0,
  },
  {
    min: 975,
    nome: 'Tarde Dourada',
    c1: '#6CAEDB',
    c2: '#E6CFAF',
    c3: '#F8D19A',
    col1: '#2F5541',
    col2: '#53725B',
    col3: '#7D957B',
    astro: '#F97316',
    est: 0.0,
  },
  {
    min: 1050,
    nome: 'Crepúsculo Coral-Ametista',
    c1: '#47366E',
    c2: '#B55A74',
    c3: '#F3A172',
    col1: '#1E1433',
    col2: '#3B234D',
    col3: '#5C3763',
    astro: '#FF8E61',
    est: 0.45,
  },
  {
    min: 1125,
    nome: 'Crepúsculo Profundo',
    c1: '#1E183E',
    c2: '#643563',
    c3: '#C8736A',
    col1: '#131029',
    col2: '#271D45',
    col3: '#3E2B5C',
    astro: '#F7BD72',
    est: 0.85,
  },
  {
    min: 1215,
    nome: 'Noite Estelar',
    c1: '#070C1A',
    c2: '#0D1730',
    c3: '#132040',
    col1: '#0B1429',
    col2: '#152545',
    col3: '#21355C',
    astro: '#F7E8B5',
    est: 1.0,
  },
  {
    min: 1440,
    nome: 'Meia-noite Estelar',
    c1: '#070C1A',
    c2: '#0D1730',
    c3: '#132040',
    col1: '#091124',
    col2: '#101D38',
    col3: '#1A2C4D',
    astro: '#F7E8B5',
    est: 1.0,
  },
];

const UI_LUMINOSA: ReadonlyArray<KeyframeUi> = [
  {
    min: 345,
    solida: '#FFF8F1',
    alt: '#F5E7DA',
    txt: '#2B1822',
    sec: '#5E3D4B',
    pri: '#8A3E52',
    priTxt: '#FFFFFF',
    secCor: '#9B4D18',
    b: '#2B694D',
    m: '#1D5A85',
    al: '#9C4B0C',
    u: '#AD223A',
  },
  {
    min: 450,
    solida: '#FFFDF8',
    alt: '#F1EDE0',
    txt: '#172430',
    sec: '#4A5D6E',
    pri: '#256B4E',
    priTxt: '#FFFFFF',
    secCor: '#B55E0B',
    b: '#2F6F4E',
    m: '#1D5C87',
    al: '#A6540A',
    u: '#B8293D',
  },
  {
    min: 630,
    solida: '#FDFEFF',
    alt: '#EBF2F7',
    txt: '#132230',
    sec: '#43586B',
    pri: '#1E6663',
    priTxt: '#FFFFFF',
    secCor: '#B05A12',
    b: '#2A6B4D',
    m: '#1B5A87',
    al: '#A6540A',
    u: '#B8293D',
  },
  {
    min: 810,
    solida: '#FFFDF7',
    alt: '#F2EFE3',
    txt: '#1A2029',
    sec: '#4C5361',
    pri: '#1F6A73',
    priTxt: '#FFFFFF',
    secCor: '#AE550B',
    b: '#2D6D4E',
    m: '#1D5C87',
    al: '#A6540A',
    u: '#B8293D',
  },
  {
    min: 975,
    solida: '#FFF9EE',
    alt: '#F4E8D4',
    txt: '#221E1A',
    sec: '#594E43',
    pri: '#A94F0D',
    priTxt: '#FFFFFF',
    secCor: '#1F6E8C',
    b: '#2F6F4E',
    m: '#1D5C87',
    al: '#A6540A',
    u: '#B8293D',
  },
  {
    min: 1049,
    solida: '#FFF3E8',
    alt: '#F3DFCE',
    txt: '#281C22',
    sec: '#61424E',
    pri: '#9C3E32',
    priTxt: '#FFFFFF',
    secCor: '#1E627D',
    b: '#2B6A4D',
    m: '#1D5882',
    al: '#9C4B0C',
    u: '#AD223A',
  },
];

const UI_NOTURNA: ReadonlyArray<KeyframeUi> = [
  {
    min: 1050,
    solida: '#1E1533',
    alt: '#2B1F47',
    txt: '#FDF5EC',
    sec: '#DFC7D9',
    pri: '#FFA26B',
    priTxt: '#1E1533',
    secCor: '#F5CF76',
    b: '#7CE0B0',
    m: '#89CCFF',
    al: '#FFC069',
    u: '#FF8A9B',
  },
  {
    min: 1125,
    solida: '#161533',
    alt: '#211F47',
    txt: '#F7F3FD',
    sec: '#C5BDDC',
    pri: '#F7BD72',
    priTxt: '#161533',
    secCor: '#7BE3D0',
    b: '#7CE0B0',
    m: '#89CCFF',
    al: '#FFC069',
    u: '#FF8A9B',
  },
  {
    min: 1215,
    solida: '#0E172E',
    alt: '#162242',
    txt: '#F1F5FF',
    sec: '#A5B4D4',
    pri: '#F5D076',
    priTxt: '#0E172E',
    secCor: '#6EE7D8',
    b: '#7CE0B0',
    m: '#89CCFF',
    al: '#FFC069',
    u: '#FF8A9B',
  },
  {
    min: 1440,
    solida: '#0B1226',
    alt: '#121C38',
    txt: '#EEF3FF',
    sec: '#A2B2D4',
    pri: '#F5D076',
    priTxt: '#0B1226',
    secCor: '#6EE7D8',
    b: '#7CE0B0',
    m: '#89CCFF',
    al: '#FFC069',
    u: '#FF8A9B',
  },
  {
    min: 1725,
    solida: '#131836',
    alt: '#1D244A',
    txt: '#F3F2FF',
    sec: '#B5BADB',
    pri: '#F5C478',
    priTxt: '#131836',
    secCor: '#7BE3D0',
    b: '#7CE0B0',
    m: '#89CCFF',
    al: '#FFC069',
    u: '#FF8A9B',
  },
  {
    min: 1784,
    solida: '#1F1B3D',
    alt: '#2B2552',
    txt: '#FBF2F6',
    sec: '#D4BFD6',
    pri: '#FFA678',
    priTxt: '#1F1B3D',
    secCor: '#F5CF76',
    b: '#7CE0B0',
    m: '#89CCFF',
    al: '#FFC069',
    u: '#FF8A9B',
  },
];

function hexParaRgb(hex: string): [number, number, number] {
  const num = Number.parseInt(hex.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbParaHex(r: number, g: number, b: number): string {
  const canais = [r, g, b].map((v) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${canais.join('').toUpperCase()}`;
}

function interpolarHex(hexA: string, hexB: string, fator: number): string {
  const [r1, g1, b1] = hexParaRgb(hexA);
  const [r2, g2, b2] = hexParaRgb(hexB);
  return rgbParaHex(r1 + (r2 - r1) * fator, g1 + (g2 - g1) * fator, b1 + (b2 - b1) * fator);
}

function calcularLuminanciaRelativa(hex: string): number {
  const canais = hexParaRgb(hex).map((valor) => {
    const normalizado = valor / 255;
    return normalizado <= 0.03928 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

export function calcularContrasteWcag(hexA: string, hexB: string): number {
  const lumA = calcularLuminanciaRelativa(hexA);
  const lumB = calcularLuminanciaRelativa(hexB);
  const maisClaro = Math.max(lumA, lumB);
  const maisEscuro = Math.min(lumA, lumB);
  return (maisClaro + 0.05) / (maisEscuro + 0.05);
}

function encontrarSegmento<T extends { min: number }>(
  lista: ReadonlyArray<T>,
  minutoAlvo: number,
): { a: T; b: T; fator: number } {
  const minClamp = Math.max(lista[0].min, Math.min(lista[lista.length - 1].min, minutoAlvo));
  for (let i = 0; i < lista.length - 1; i += 1) {
    const a = lista[i];
    const b = lista[i + 1];
    if (minClamp >= a.min && minClamp <= b.min) {
      const fator = b.min === a.min ? 0 : (minClamp - a.min) / (b.min - a.min);
      return { a, b, fator };
    }
  }
  const ultimo = lista[lista.length - 1];
  return { a: ultimo, b: ultimo, fator: 0 };
}

export function calcularEstadoCromatico(minutoDoDia: number): EstadoCromatico24h {
  const minuto = normalizarMinutoDoDia(minutoDoDia);
  const { a: ceuA, b: ceuB, fator: tCeu } = encontrarSegmento(CEU_KEYS, minuto);

  const luminosa = minuto >= 345 && minuto <= 1049;
  const listaUi = luminosa ? UI_LUMINOSA : UI_NOTURNA;
  const minutoUi = !luminosa && minuto < 345 ? minuto + 1440 : minuto;
  const { a: uiA, b: uiB, fator: tUi } = encontrarSegmento(listaUi, minutoUi);

  const superficieSolida = interpolarHex(uiA.solida, uiB.solida, tUi);
  const texto = interpolarHex(uiA.txt, uiB.txt, tUi);
  const [sr, sg, sb] = hexParaRgb(superficieSolida);
  const [tr, tg, tb] = hexParaRgb(texto);
  const prioBaixa = interpolarHex(uiA.b, uiB.b, tUi);
  const prioUrgente = interpolarHex(uiA.u, uiB.u, tUi);

  return {
    minuto,
    nomeMomento: tCeu < 0.5 ? ceuA.nome : ceuB.nome,
    polaridade: luminosa ? 'clara' : 'escura',
    ceuTopo: interpolarHex(ceuA.c1, ceuB.c1, tCeu),
    ceuMeio: interpolarHex(ceuA.c2, ceuB.c2, tCeu),
    ceuBase: interpolarHex(ceuA.c3, ceuB.c3, tCeu),
    colina1: interpolarHex(ceuA.col1, ceuB.col1, tCeu),
    colina2: interpolarHex(ceuA.col2, ceuB.col2, tCeu),
    colina3: interpolarHex(ceuA.col3, ceuB.col3, tCeu),
    astro: interpolarHex(ceuA.astro, ceuB.astro, tCeu),
    opacidadeEstrelas: Number((ceuA.est + (ceuB.est - ceuA.est) * tCeu).toFixed(2)),
    superficie: `rgba(${sr}, ${sg}, ${sb}, ${luminosa ? 0.92 : 0.9})`,
    superficieSolida,
    superficieAlt: interpolarHex(uiA.alt, uiB.alt, tUi),
    borda: `rgba(${tr}, ${tg}, ${tb}, ${luminosa ? 0.16 : 0.18})`,
    texto,
    textoSec: interpolarHex(uiA.sec, uiB.sec, tUi),
    primaria: interpolarHex(uiA.pri, uiB.pri, tUi),
    primariaTexto: interpolarHex(uiA.priTxt, uiB.priTxt, tUi),
    secundaria: interpolarHex(uiA.secCor, uiB.secCor, tUi),
    sucesso: prioBaixa,
    erro: prioUrgente,
    prioBaixa,
    prioMedia: interpolarHex(uiA.m, uiB.m, tUi),
    prioAlta: interpolarHex(uiA.al, uiB.al, tUi),
    prioUrgente,
  };
}

export function gerarVariaveisCss(estado: EstadoCromatico24h): Record<string, string> {
  return {
    '--ceu-topo': estado.ceuTopo,
    '--ceu-meio': estado.ceuMeio,
    '--ceu-base': estado.ceuBase,
    '--superficie': estado.superficie,
    '--superficie-solida': estado.superficieSolida,
    '--superficie-alt': estado.superficieAlt,
    '--borda': estado.borda,
    '--texto': estado.texto,
    '--texto-sec': estado.textoSec,
    '--primaria': estado.primaria,
    '--primaria-texto': estado.primariaTexto,
    '--secundaria': estado.secundaria,
    '--sucesso': estado.sucesso,
    '--erro': estado.erro,
    '--prio-baixa': estado.prioBaixa,
    '--prio-media': estado.prioMedia,
    '--prio-alta': estado.prioAlta,
    '--prio-urgente': estado.prioUrgente,
    '--cor-fundo-alvorada': estado.ceuTopo,
    '--cor-superficie': estado.superficieSolida,
    '--cor-texto-principal': estado.texto,
    '--cor-texto-suave': estado.textoSec,
    '--cor-primaria': estado.primaria,
    '--cor-borda': estado.borda,
  };
}
