import type { MomentoDoDia } from '../../astronomia/tipos';
import type { StatusTarefa, TarefaArvore } from '../../servicos/tipos-jornada';

export type TemaTemporizadorFoco = 'solar' | 'lunar';

export const PRESETS_DURACAO_FOCO = [15, 25, 45, 60] as const;
export const DURACAO_MINUTOS_MIN = 1;
export const DURACAO_MINUTOS_MAX = 240;

export interface OpcaoTarefaFoco {
  id: string;
  titulo: string;
  nivel: number;
  status: StatusTarefa;
  subtarefasImediatasCount: number;
}

export function resolverTemaTemporizador(momentoDoDia: MomentoDoDia): TemaTemporizadorFoco {
  if (momentoDoDia === 'manha' || momentoDoDia === 'tarde') {
    return 'solar';
  }
  return 'lunar';
}

export function formatarCronometroSegundos(segundosBrutos: number): string {
  const total = Math.max(0, Math.floor(segundosBrutos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;

  const mm = String(minutos).padStart(2, '0');
  const ss = String(segundos).padStart(2, '0');
  if (horas > 0) {
    return `${horas}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function calcularProgressoTemporizador(
  duracaoPlanejadaSeg: number,
  segundosRestantes: number,
): number {
  if (duracaoPlanejadaSeg <= 0) {
    return 0;
  }
  const concluido = Math.max(0, duracaoPlanejadaSeg - Math.max(0, segundosRestantes));
  return Math.max(0, Math.min(1, concluido / duracaoPlanejadaSeg));
}

export function calcularSegundosRestantesIniciais(
  duracaoPlanejadaSeg: number,
  iniciadaEmIso: string,
  agoraMs = Date.now(),
): number {
  const inicioMs = Date.parse(iniciadaEmIso);
  if (!Number.isFinite(inicioMs)) {
    return Math.max(0, duracaoPlanejadaSeg);
  }
  const decorridoSeg = Math.max(0, Math.floor((agoraMs - inicioMs) / 1000));
  return Math.max(0, duracaoPlanejadaSeg - decorridoSeg);
}

export function achatarTarefasParaSelecao(raizes: readonly TarefaArvore[]): OpcaoTarefaFoco[] {
  const saida: OpcaoTarefaFoco[] = [];
  const visitar = (no: TarefaArvore, nivel: number): void => {
    saida.push({
      id: no.id,
      titulo: no.titulo,
      nivel,
      status: no.status,
      subtarefasImediatasCount: no.subtarefas.length,
    });
    for (const filha of no.subtarefas) {
      visitar(filha, nivel + 1);
    }
  };

  for (const raiz of raizes) {
    visitar(raiz, 0);
  }
  return saida;
}

export function extrairSubtarefasImediatas(
  raizes: readonly TarefaArvore[],
  tarefaId: string | null,
): TarefaArvore[] {
  if (!tarefaId) {
    return [];
  }
  const procurar = (lista: readonly TarefaArvore[]): TarefaArvore | null => {
    for (const item of lista) {
      if (item.id === tarefaId) {
        return item;
      }
      const achou = procurar(item.subtarefas);
      if (achou) {
        return achou;
      }
    }
    return null;
  };
  const no = procurar(raizes);
  return no ? [...no.subtarefas] : [];
}
