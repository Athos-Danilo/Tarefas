import type { FaixaFavicon, MomentoDoDia } from './tipos';

export interface PosicaoAstros {
  minuto: number;
  momentoDoDia: MomentoDoDia;
  faixaFavicon: FaixaFavicon;
  solVisivel: boolean;
  luaVisivel: boolean;
  progressoSol: number;
  progressoLua: number;
  solX: number;
  solY: number;
  luaX: number;
  luaY: number;
}

const MINUTOS_NO_DIA = 1440;
const INICIO_MANHA = 345; // 05:45
const INICIO_TARDE = 720; // 12:00
const INICIO_ENTARDECER = 1020; // 17:00
const INICIO_NOITE = 1140; // 19:00
const POENTE_SOLAR = 1095; // 18:15

export function normalizarMinutoDoDia(minuto: number): number {
  return ((Math.round(minuto) % MINUTOS_NO_DIA) + MINUTOS_NO_DIA) % MINUTOS_NO_DIA;
}

export function obterMinutoDeData(data: Date): number {
  return data.getHours() * 60 + data.getMinutes();
}

export function formatarMinutoParaHora(minuto: number): string {
  const m = normalizarMinutoDoDia(minuto);
  const horas = Math.floor(m / 60)
    .toString()
    .padStart(2, '0');
  const minutos = (m % 60).toString().padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function obterFaixaFavicon(minuto: number): FaixaFavicon {
  const m = normalizarMinutoDoDia(minuto);
  if (m >= INICIO_MANHA && m < INICIO_TARDE) {
    return 'manha';
  }
  if (m >= INICIO_TARDE && m < INICIO_ENTARDECER) {
    return 'tarde';
  }
  if (m >= INICIO_ENTARDECER && m < INICIO_NOITE) {
    return 'entardecer';
  }
  return 'noite';
}

export function obterMomentoDoDia(minuto: number): MomentoDoDia {
  const faixa = obterFaixaFavicon(minuto);
  return faixa === 'entardecer' ? 'crepusculo' : faixa;
}

export function obterSaudacaoDoMomento(momento: MomentoDoDia): string {
  switch (momento) {
    case 'manha':
      return 'Bom dia';
    case 'tarde':
      return 'Boa tarde';
    case 'crepusculo':
      return 'Bom entardecer';
    case 'noite':
      return 'Boa noite';
  }
}

export function calcularPosicaoAstros(minutoDoDia: number): PosicaoAstros {
  const minuto = normalizarMinutoDoDia(minutoDoDia);
  const momentoDoDia = obterMomentoDoDia(minuto);
  const faixaFavicon = obterFaixaFavicon(minuto);
  const solVisivel = minuto >= INICIO_MANHA && minuto < POENTE_SOLAR;
  const luaVisivel = !solVisivel;

  const progressoSol = solVisivel ? (minuto - INICIO_MANHA) / (POENTE_SOLAR - INICIO_MANHA) : 0;

  const minutosNoiteTotal = MINUTOS_NO_DIA - POENTE_SOLAR + INICIO_MANHA;
  const minutoNaNoite =
    minuto >= POENTE_SOLAR ? minuto - POENTE_SOLAR : minuto + (MINUTOS_NO_DIA - POENTE_SOLAR);
  const progressoLua = luaVisivel ? Math.min(1, Math.max(0, minutoNaNoite / minutosNoiteTotal)) : 0;

  const solX = Number((70 + progressoSol * 660).toFixed(1));
  const solY = Number((224 - Math.sin(progressoSol * Math.PI) * 168).toFixed(1));
  const luaX = Number((85 + progressoLua * 630).toFixed(1));
  const luaY = Number((215 - Math.sin(progressoLua * Math.PI) * 158).toFixed(1));

  return {
    minuto,
    momentoDoDia,
    faixaFavicon,
    solVisivel,
    luaVisivel,
    progressoSol,
    progressoLua,
    solX,
    solY,
    luaX,
    luaY,
  };
}
