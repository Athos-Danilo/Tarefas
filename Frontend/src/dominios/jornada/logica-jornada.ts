import { arrayMove } from '@dnd-kit/sortable';
import { z } from 'zod';
import type { PrioridadeTarefa } from '../../astronomia/tipos';
import type {
  BlocoNota,
  ConfiguracaoRecorrencia,
  ItemOrdenacaoIrma,
  StatusTarefa,
  TarefaArvore,
  TurnoTarefa,
} from '../../servicos/tipos-jornada';

export const PROFUNDIDADE_MAXIMA = 5;
export const MAX_ETIQUETAS_USUARIO = 30;
export const MAX_ETIQUETAS_POR_TAREFA = 8;
export const MAX_BLOCOS_POR_TAREFA = 50;
export const MAX_CARACTERES_NOTAS = 15000;

export const ORDEM_TURNOS: readonly TurnoTarefa[] = ['manha', 'tarde', 'noite', 'livre'];

export const ROTULOS_TURNO: Record<TurnoTarefa, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  livre: 'Livre',
};

export const ROTULOS_STATUS: Record<StatusTarefa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export const ROTULOS_PRIORIDADE: Record<PrioridadeTarefa, string> = {
  baixa: '● Baixa',
  media: '▲ Média',
  alta: '◆ Alta',
  urgente: '★ Urgente',
};

export const DIAS_SEMANA_LUME: ReadonlyArray<{ valor: number; rotulo: string }> = [
  { valor: 0, rotulo: 'Dom' },
  { valor: 1, rotulo: 'Seg' },
  { valor: 2, rotulo: 'Ter' },
  { valor: 3, rotulo: 'Qua' },
  { valor: 4, rotulo: 'Qui' },
  { valor: 5, rotulo: 'Sex' },
  { valor: 6, rotulo: 'Sáb' },
];

export const OPCOES_ANTECEDENCIA_LEMBRETE: ReadonlyArray<{
  minutos: number;
  rotulo: string;
}> = [
  { minutos: 5, rotulo: '5 min antes' },
  { minutos: 15, rotulo: '15 min antes' },
  { minutos: 30, rotulo: '30 min antes' },
  { minutos: 60, rotulo: '1 hora antes' },
  { minutos: 1440, rotulo: '1 dia antes' },
];

export const CORES_PADRAO_ETIQUETA: readonly string[] = [
  '#1D5C87',
  '#256B4E',
  '#A6540A',
  '#B8293D',
  '#6B4FA8',
  '#3A7CA5',
];

export const esquemaNovaTarefa = z.object({
  titulo: z
    .string()
    .transform((valor) => valor.trim())
    .refine((valor) => valor.length >= 1 && valor.length <= 160, {
      message: 'Informe um título entre 1 e 160 caracteres.',
    }),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  turno: z.enum(['manha', 'tarde', 'noite', 'livre']),
});

export const esquemaEtiqueta = z.object({
  nome: z
    .string()
    .transform((valor) => valor.trim().replace(/\s+/g, ' '))
    .refine((valor) => valor.length >= 1 && valor.length <= 30, {
      message: 'O nome da etiqueta deve ter entre 1 e 30 caracteres.',
    }),
  cor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Use cor hexadecimal no formato #RRGGBB.'),
});

function compararIrmas(a: TarefaArvore, b: TarefaArvore): number {
  if (a.ordemManual !== b.ordemManual) {
    return a.ordemManual - b.ordemManual;
  }
  return a.criadoEm.localeCompare(b.criadoEm);
}

export function agruparRaizesPorTurno(
  raizes: readonly TarefaArvore[],
): Record<TurnoTarefa, TarefaArvore[]> {
  const mapa: Record<TurnoTarefa, TarefaArvore[]> = {
    manha: [],
    tarde: [],
    noite: [],
    livre: [],
  };

  for (const item of raizes) {
    mapa[item.turno].push(item);
  }

  for (const turno of ORDEM_TURNOS) {
    mapa[turno].sort(compararIrmas);
  }

  return mapa;
}

export function achatarArvore(raizes: readonly TarefaArvore[]): TarefaArvore[] {
  const resultado: TarefaArvore[] = [];
  const visitar = (nos: readonly TarefaArvore[]) => {
    for (const no of nos) {
      resultado.push(no);
      if (no.subtarefas.length > 0) {
        visitar(no.subtarefas);
      }
    }
  };
  visitar(raizes);
  return resultado;
}

export function encontrarTarefaNaArvore(
  raizes: readonly TarefaArvore[],
  id: string,
): TarefaArvore | null {
  for (const no of raizes) {
    if (no.id === id) {
      return no;
    }
    const emFilha = encontrarTarefaNaArvore(no.subtarefas, id);
    if (emFilha) {
      return emFilha;
    }
  }
  return null;
}

export function obterAlturaSubarvore(tarefa: TarefaArvore): number {
  if (tarefa.subtarefas.length === 0) {
    return 1;
  }
  let maiorFilha = 0;
  for (const filha of tarefa.subtarefas) {
    const alt = obterAlturaSubarvore(filha);
    if (alt > maiorFilha) {
      maiorFilha = alt;
    }
  }
  return 1 + maiorFilha;
}

function coletarIdsDescendentes(tarefa: TarefaArvore): Set<string> {
  const ids = new Set<string>();
  const visitar = (nos: readonly TarefaArvore[]) => {
    for (const filho of nos) {
      ids.add(filho.id);
      visitar(filho.subtarefas);
    }
  };
  visitar(tarefa.subtarefas);
  return ids;
}

export function podeMoverParaPai(
  raizes: readonly TarefaArvore[],
  tarefaId: string,
  novoPaiId: string | null,
): boolean {
  const alvo = encontrarTarefaNaArvore(raizes, tarefaId);
  if (!alvo) {
    return false;
  }
  if (novoPaiId === null) {
    return obterAlturaSubarvore(alvo) <= PROFUNDIDADE_MAXIMA;
  }
  if (novoPaiId === tarefaId) {
    return false;
  }
  const descendentes = coletarIdsDescendentes(alvo);
  if (descendentes.has(novoPaiId)) {
    return false;
  }
  const novoPai = encontrarTarefaNaArvore(raizes, novoPaiId);
  if (!novoPai) {
    return false;
  }
  return novoPai.profundidade + obterAlturaSubarvore(alvo) <= PROFUNDIDADE_MAXIMA;
}

export function listarPaisValidosParaMover(
  raizes: readonly TarefaArvore[],
  tarefaId: string,
): TarefaArvore[] {
  return achatarArvore(raizes).filter((candidato) =>
    podeMoverParaPai(raizes, tarefaId, candidato.id),
  );
}

export function validarRecorrenciaLocal(
  rec: ConfiguracaoRecorrencia,
): { valida: true } | { valida: false; mensagem: string } {
  if (rec.tipo === 'nenhuma') {
    return { valida: true };
  }
  if (!Number.isInteger(rec.intervalo) || rec.intervalo < 1 || rec.intervalo > 365) {
    return { valida: false, mensagem: 'O intervalo de recorrência deve ficar entre 1 e 365.' };
  }
  if (rec.tipo === 'semanal') {
    if (rec.diasSemana.length === 0) {
      return { valida: false, mensagem: 'Escolha ao menos um dia da semana.' };
    }
    if (rec.diasSemana.some((dia) => dia < 0 || dia > 6)) {
      return { valida: false, mensagem: 'Dias da semana devem estar entre Dom (0) e Sáb (6).' };
    }
  }
  if (rec.tipo === 'mensal' && rec.diaMes !== null) {
    if (!Number.isInteger(rec.diaMes) || rec.diaMes < 1 || rec.diaMes > 31) {
      return { valida: false, mensagem: 'O dia do mês deve estar entre 1 e 31.' };
    }
  }
  return { valida: true };
}

export function descreverRecorrencia(rec: ConfiguracaoRecorrencia): string | null {
  if (rec.tipo === 'nenhuma') {
    return null;
  }
  if (rec.tipo === 'diaria') {
    return rec.intervalo === 1 ? 'Diária' : `A cada ${rec.intervalo} dias`;
  }
  if (rec.tipo === 'semanal') {
    const nomes = [...rec.diasSemana]
      .sort((a, b) => a - b)
      .map((d) => DIAS_SEMANA_LUME.find((item) => item.valor === d)?.rotulo ?? String(d));
    const prefixo = rec.intervalo === 1 ? 'Semanal' : `A cada ${rec.intervalo} sem.`;
    return nomes.length > 0 ? `${prefixo}: ${nomes.join(', ')}` : prefixo;
  }
  const dia = rec.diaMes ? `dia ${rec.diaMes}` : 'dia do prazo';
  return rec.intervalo === 1 ? `Mensal (${dia})` : `A cada ${rec.intervalo} meses (${dia})`;
}

export function validarUrlSeguraNota(urlBruta: string): boolean {
  const limpa = urlBruta.trim();
  if (!limpa) {
    return false;
  }
  try {
    const analisada = new URL(limpa);
    return (
      (analisada.protocol === 'http:' || analisada.protocol === 'https:') &&
      Boolean(analisada.hostname)
    );
  } catch {
    return false;
  }
}

export function contarCaracteresBlocos(blocos: readonly BlocoNota[]): number {
  let total = 0;
  for (const bloco of blocos) {
    switch (bloco.tipo) {
      case 'subtitulo':
      case 'paragrafo':
        total += bloco.texto.length;
        break;
      case 'lista':
        for (const item of bloco.itens) {
          total += item.length;
        }
        break;
      case 'checklist':
        for (const item of bloco.itens) {
          total += item.texto.length;
        }
        break;
      case 'citacao':
        total += bloco.texto.length + (bloco.autor ? bloco.autor.length : 0);
        break;
      case 'codigo_ou_link':
        total += bloco.conteudo.length + (bloco.rotulo ? bloco.rotulo.length : 0);
        break;
    }
  }
  return total;
}

export function validarBlocoNota(
  bloco: BlocoNota,
): { valido: true } | { valido: false; mensagem: string } {
  if (bloco.tipo === 'codigo_ou_link' && bloco.subtipo === 'link') {
    if (!validarUrlSeguraNota(bloco.conteudo)) {
      return {
        valido: false,
        mensagem: 'Links nas notas aceitam apenas os protocolos http:// ou https://.',
      };
    }
  }
  if (bloco.tipo === 'subtitulo' && !bloco.texto.trim()) {
    return { valido: false, mensagem: 'O subtítulo precisa de algum texto.' };
  }
  return { valido: true };
}

export function validarListaBlocos(
  blocos: readonly BlocoNota[],
): { valida: true } | { valida: false; mensagem: string } {
  if (blocos.length > MAX_BLOCOS_POR_TAREFA) {
    return {
      valida: false,
      mensagem: `Cada tarefa aceita no máximo ${MAX_BLOCOS_POR_TAREFA} blocos de notas.`,
    };
  }
  if (contarCaracteresBlocos(blocos) > MAX_CARACTERES_NOTAS) {
    return {
      valida: false,
      mensagem: `O total de texto nas notas excede ${MAX_CARACTERES_NOTAS} caracteres.`,
    };
  }
  for (const bloco of blocos) {
    const res = validarBlocoNota(bloco);
    if (!res.valido) {
      return { valida: false, mensagem: res.mensagem };
    }
  }
  return { valida: true };
}

export function calcularNovaOrdenacaoIrmas(
  irmasOrdenadas: readonly TarefaArvore[],
  origemId: string,
  destinoId: string,
): ItemOrdenacaoIrma[] {
  const indiceOrigem = irmasOrdenadas.findIndex((item) => item.id === origemId);
  const indiceDestino = irmasOrdenadas.findIndex((item) => item.id === destinoId);
  if (indiceOrigem === -1 || indiceDestino === -1 || indiceOrigem === indiceDestino) {
    return irmasOrdenadas.map((item, indice) => ({
      tarefaId: item.id,
      ordemManual: indice,
    }));
  }
  const movidas = arrayMove([...irmasOrdenadas], indiceOrigem, indiceDestino);
  return movidas.map((item, indice) => ({
    tarefaId: item.id,
    ordemManual: indice,
  }));
}

export function calcularProgressoGeralJornada(raizes: readonly TarefaArvore[]): number {
  let totalFolhas = 0;
  let folhasConcluidas = 0;
  for (const raiz of raizes) {
    totalFolhas += raiz.totalFolhas;
    folhasConcluidas += raiz.folhasConcluidas;
  }
  if (totalFolhas <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, folhasConcluidas / totalFolhas));
}

export function arredondarCoordenadaAproximada(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularHorarioLembrete(
  prazoIso: string | null,
  antecedenciaMin: number,
): Date | null {
  if (!prazoIso || antecedenciaMin < 0) {
    return null;
  }
  const timestamp = Date.parse(prazoIso);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp - antecedenciaMin * 60_000);
}

export function formatarPrazoCurto(prazoIso: string | null): string | null {
  if (!prazoIso) {
    return null;
  }
  const data = new Date(prazoIso);
  if (Number.isNaN(data.getTime())) {
    return null;
  }
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${hora}:${min}`;
}

export function converterIsoParaInputLocal(prazoIso: string | null): string {
  if (!prazoIso) {
    return '';
  }
  const data = new Date(prazoIso);
  if (Number.isNaN(data.getTime())) {
    return '';
  }
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}:${min}`;
}

export function converterInputLocalParaIso(valor: string): string | null {
  const limpo = valor.trim();
  if (!limpo) {
    return null;
  }
  const data = new Date(limpo);
  if (Number.isNaN(data.getTime())) {
    return null;
  }
  return data.toISOString();
}
