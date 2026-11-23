import type {
  DistribuicaoPrioridadeFrontend,
  DistribuicaoTurnoFrontend,
} from '../../servicos/tipos-estatisticas';

const PADRAO_HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const ROTULOS_EVENTOS: Record<string, string> = {
  tarefa_criada: 'Tarefa criada',
  tarefa_concluida: 'Tarefa concluída',
  cascata_concluida: 'Cascata concluída',
  tarefa_reaberta: 'Tarefa reaberta',
  arvore_iluminada: 'Constelação iluminada',
  foco_concluido: 'Foco concluído',
  foco_interrompido: 'Foco interrompido',
  grupo_compartilhado: 'Constelação compartilhada',
  grupo_entrada: 'Entrada no grupo',
  grupo_atribuicao: 'Atribuição em grupo',
  grupo_lideranca: 'Transferência de liderança',
  grupo_membro_removido: 'Membro removido',
  grupo_saida: 'Saída do grupo',
  ciclo_diario: 'Marco do ciclo',
};

export const TIPOS_EVENTO_FILTRO = [
  { valor: '', rotulo: 'Todos os eventos' },
  { valor: 'tarefa_criada', rotulo: 'Tarefa criada' },
  { valor: 'tarefa_concluida', rotulo: 'Tarefa concluída' },
  { valor: 'cascata_concluida', rotulo: 'Cascata concluída' },
  { valor: 'tarefa_reaberta', rotulo: 'Tarefa reaberta' },
  { valor: 'arvore_iluminada', rotulo: 'Constelação iluminada' },
  { valor: 'foco_concluido', rotulo: 'Foco concluído' },
  { valor: 'foco_interrompido', rotulo: 'Foco interrompido' },
  { valor: 'grupo_atribuicao', rotulo: 'Atribuição em grupo' },
  { valor: 'grupo_compartilhado', rotulo: 'Constelação compartilhada' },
] as const;

export function horaSimuladaParaMinuto(hora: string | null): number | null {
  if (!hora) {
    return null;
  }
  const limpa = hora.trim();
  if (!PADRAO_HHMM.test(limpa)) {
    return null;
  }
  const [horasStr, minStr] = limpa.split(':');
  return Number(horasStr) * 60 + Number(minStr);
}

export function minutoParaHoraSimulada(minuto: number): string {
  const normalizado = ((Math.round(minuto) % 1440) + 1440) % 1440;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatarRotuloTipoEvento(tipo: string): string {
  return ROTULOS_EVENTOS[tipo] ?? tipo;
}

export function formatarDuracaoHoras(horas: number): string {
  return `${horas.toFixed(1).replace('.', ',')} h`;
}

export function formatarMinutosFoco(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) {
    return `${total} min`;
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function obterClasseIntensidadeCalor(intensidade: number): string {
  if (intensidade <= 0) {
    return 'bg-white/5 border-[var(--borda)]';
  }
  if (intensidade === 1) {
    return 'bg-amber-300/35 border-amber-300/50';
  }
  if (intensidade === 2) {
    return 'bg-amber-400/65 border-amber-400/75';
  }
  if (intensidade === 3) {
    return 'bg-emerald-400/65 border-emerald-400/75';
  }
  return 'bg-emerald-500/85 border-emerald-300';
}

export interface ItemSerieDistribuicao {
  chave: string;
  rotulo: string;
  total: number;
  cor: string;
}

export function construirSeriesDistribuicao(
  porTurno: DistribuicaoTurnoFrontend,
  porPrioridade: DistribuicaoPrioridadeFrontend,
): {
  porTurno: ItemSerieDistribuicao[];
  porPrioridade: ItemSerieDistribuicao[];
} {
  return {
    porTurno: [
      { chave: 'manha', rotulo: 'Manhã', total: porTurno.manha, cor: '#F59E0B' },
      { chave: 'tarde', rotulo: 'Tarde', total: porTurno.tarde, cor: '#0EA5E9' },
      { chave: 'noite', rotulo: 'Noite', total: porTurno.noite, cor: '#6366F1' },
      { chave: 'livre', rotulo: 'Livre', total: porTurno.livre, cor: '#14B8A6' },
    ],
    porPrioridade: [
      { chave: 'baixa', rotulo: 'Baixa', total: porPrioridade.baixa, cor: '#64748B' },
      { chave: 'media', rotulo: 'Média', total: porPrioridade.media, cor: '#3B82F6' },
      { chave: 'alta', rotulo: 'Alta', total: porPrioridade.alta, cor: '#F97316' },
      { chave: 'urgente', rotulo: 'Urgente', total: porPrioridade.urgente, cor: '#EF4444' },
    ],
  };
}

export function formatarDataCurtaBr(dataIso: string): string {
  const partes = dataIso.split('-');
  if (partes.length !== 3) {
    return dataIso;
  }
  return `${partes[2]}/${partes[1]}`;
}

export function formatarInstanteBr(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}
