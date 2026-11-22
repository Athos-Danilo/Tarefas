export type Hemisferio = 'sul' | 'norte';

export type CodigoFaseLunar =
  | 'lua_nova'
  | 'crescente_inicial'
  | 'quarto_crescente'
  | 'crescente_gibosa'
  | 'lua_cheia'
  | 'minguante_gibosa'
  | 'quarto_minguante'
  | 'minguante_balsamica';

export type LadoIluminadoLunar = 'esquerda' | 'direita';

export interface DadosFaseLunar {
  codigo: CodigoFaseLunar;
  nome: string;
  idadeDias: number;
  fracaoCiclo: number;
  fracaoIluminada: number;
  percentualIluminado: number;
  crescente: boolean;
  hemisferio: Hemisferio;
  ladoIluminado: LadoIluminadoLunar;
}

const LUA_NOVA_REFERENCIA_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const MILISSEGUNDOS_POR_DIA = 86_400_000;
const CICLO_SINODICO_DIAS = 29.530588853;

const FASES_DESCRICAO: ReadonlyArray<{ codigo: CodigoFaseLunar; nome: string }> = [
  { codigo: 'lua_nova', nome: 'Lua Nova' },
  { codigo: 'crescente_inicial', nome: 'Lua Crescente' },
  { codigo: 'quarto_crescente', nome: 'Quarto Crescente' },
  { codigo: 'crescente_gibosa', nome: 'Gibosa Crescente' },
  { codigo: 'lua_cheia', nome: 'Lua Cheia' },
  { codigo: 'minguante_gibosa', nome: 'Gibosa Minguante' },
  { codigo: 'quarto_minguante', nome: 'Quarto Minguante' },
  { codigo: 'minguante_balsamica', nome: 'Lua Minguante' },
];

function normalizarFracaoCiclo(valor: number): number {
  return ((valor % 1) + 1) % 1;
}

export function calcularFaseLunar(
  data: Date = new Date(),
  hemisferio: Hemisferio = 'sul',
): DadosFaseLunar {
  const diasDesdeReferencia = (data.getTime() - LUA_NOVA_REFERENCIA_MS) / MILISSEGUNDOS_POR_DIA;
  const fracaoCiclo = normalizarFracaoCiclo(diasDesdeReferencia / CICLO_SINODICO_DIAS);
  const idadeDias = Number((fracaoCiclo * CICLO_SINODICO_DIAS).toFixed(2));
  const fracaoIluminada = Number((0.5 * (1 - Math.cos(2 * Math.PI * fracaoCiclo))).toFixed(4));
  const percentualIluminado = Math.round(fracaoIluminada * 100);

  const indiceFase = Math.round(fracaoCiclo * 8) % 8;
  const { codigo, nome } = FASES_DESCRICAO[indiceFase];
  const crescente = fracaoCiclo < 0.5 || fracaoCiclo > 0.98;
  const ladoIluminado: LadoIluminadoLunar =
    hemisferio === 'sul'
      ? crescente
        ? 'esquerda'
        : 'direita'
      : crescente
        ? 'direita'
        : 'esquerda';

  return {
    codigo,
    nome,
    idadeDias,
    fracaoCiclo,
    fracaoIluminada,
    percentualIluminado,
    crescente,
    hemisferio,
    ladoIluminado,
  };
}

export function gerarCaminhoLuaSvg(
  fracaoCiclo: number,
  raio: number,
  hemisferio: Hemisferio = 'sul',
): string {
  const f = normalizarFracaoCiclo(fracaoCiclo);
  const r = Math.max(1, raio);

  if (f <= 0.02 || f >= 0.98) {
    return '';
  }

  if (Math.abs(f - 0.5) <= 0.02) {
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
  }

  const crescente = f < 0.5;
  const iluminarEsquerda = hemisferio === 'sul' ? crescente : !crescente;
  const sweepExterno = iluminarEsquerda ? 0 : 1;
  const fracaoIluminada = 0.5 * (1 - Math.cos(2 * Math.PI * f));
  const rx = Math.max(0.01, Number((Math.abs(Math.cos(2 * Math.PI * f)) * r).toFixed(2)));

  const sweepInterno = iluminarEsquerda
    ? fracaoIluminada <= 0.5
      ? 1
      : 0
    : fracaoIluminada <= 0.5
      ? 0
      : 1;

  return `M 0 ${-r} A ${r} ${r} 0 0 ${sweepExterno} 0 ${r} A ${rx} ${r} 0 0 ${sweepInterno} 0 ${-r} Z`;
}
