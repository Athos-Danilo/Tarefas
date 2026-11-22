import type { Qualidade3D } from '../astronomia/tipos';

export type ModoRenderizacao = '3d' | 'fallback_2d';

export type MotivoModoRenderizacao =
  'preferencia_usuario' | 'movimento_reduzido' | 'sem_webgl' | 'webgl_ativo';

export interface EntradaCapacidadeRenderizacao {
  qualidadePreferida: Qualidade3D;
  movimentoReduzido: boolean;
  suporteWebGL: boolean;
}

export interface ResultadoModoRenderizacao {
  modo: ModoRenderizacao;
  motivo: MotivoModoRenderizacao;
}

export function detectarSuporteWebGL(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') {
      return false;
    }
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function detectarMovimentoReduzidoSistema(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const detectarMovimentoReduzido = detectarMovimentoReduzidoSistema;

export function resolverModoRenderizacao({
  qualidadePreferida,
  movimentoReduzido,
  suporteWebGL,
}: EntradaCapacidadeRenderizacao): ResultadoModoRenderizacao {
  if (qualidadePreferida === 'desempenho_2d') {
    return { modo: 'fallback_2d', motivo: 'preferencia_usuario' };
  }
  if (movimentoReduzido) {
    return { modo: 'fallback_2d', motivo: 'movimento_reduzido' };
  }
  if (!suporteWebGL) {
    return { modo: 'fallback_2d', motivo: 'sem_webgl' };
  }
  return { modo: '3d', motivo: 'webgl_ativo' };
}
