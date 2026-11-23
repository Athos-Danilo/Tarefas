import { z } from 'zod';
import type { PapelGrupo, VagaDisponivelPrevia } from '../../servicos/tipos-grupos';
import type { TarefaArvore } from '../../servicos/tipos-jornada';
import { PROFUNDIDADE_MAXIMA } from '../jornada/logica-jornada';

export const MAX_PARTICIPANTES_GRUPO = 10;
export const NOME_VAGA_MIN = 2;
export const NOME_VAGA_MAX = 60;
export const INTERVALO_POLLING_GRUPO_MS = 12_000;
const CHAVE_CONVITE_PENDENTE = 'lume_convite_grupo_pendente';

export const esquemaNovaVaga = z.object({
  nomeExibicao: z
    .string()
    .transform((valor) => valor.trim().replace(/\s+/g, ' '))
    .refine((valor) => valor.length >= NOME_VAGA_MIN && valor.length <= NOME_VAGA_MAX, {
      message: `O nome da vaga deve ter entre ${NOME_VAGA_MIN} e ${NOME_VAGA_MAX} caracteres.`,
    }),
  emailOpcional: z
    .string()
    .transform((valor) => valor.trim())
    .refine(
      (valor) => valor === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor),
      'Informe um e-mail válido ou deixe o campo em branco.',
    ),
});

export function encontrarVagaAutomaticaPorEmail(
  vagas: readonly VagaDisponivelPrevia[],
  emailUsuario: string,
): VagaDisponivelPrevia | null {
  const emailNormalizado = emailUsuario.trim().toLowerCase();
  if (!emailNormalizado) {
    return null;
  }
  return (
    vagas.find(
      (vaga) =>
        Boolean(vaga.emailOpcional) &&
        vaga.emailOpcional?.trim().toLowerCase() === emailNormalizado,
    ) ?? null
  );
}

function construirMapaPorId(raiz: TarefaArvore): Map<string, TarefaArvore> {
  const mapa = new Map<string, TarefaArvore>();
  const visitar = (no: TarefaArvore) => {
    mapa.set(no.id, no);
    for (const sub of no.subtarefas) {
      visitar(sub);
    }
  };
  visitar(raiz);
  return mapa;
}

export function noPertenceAoEscopoDoColaborador(
  raizArvore: TarefaArvore,
  alvoId: string,
  colaboradorId: string,
): boolean {
  const porId = construirMapaPorId(raizArvore);
  const visitados = new Set<string>();
  let atual: TarefaArvore | undefined = porId.get(alvoId);

  while (atual && !visitados.has(atual.id)) {
    visitados.add(atual.id);
    if (atual.responsavel) {
      if (atual.responsavel.tipo === 'usuario') {
        return atual.responsavel.usuarioId === colaboradorId;
      }
      return false;
    }
    atual = atual.tarefaPaiId ? porId.get(atual.tarefaPaiId) : undefined;
  }

  return false;
}

export interface PermissoesNoGrupo {
  compartilhada: boolean;
  ehLider: boolean;
  podeEditar: boolean;
  podeConcluirOuReabrir: boolean;
  podeAdicionarSubtarefa: boolean;
  podeExcluir: boolean;
  podeGerenciarGrupo: boolean;
}

export function obterPermissoesNoGrupo({
  raizArvore,
  no,
  meuPapel,
  usuarioAtualId,
}: {
  raizArvore: TarefaArvore;
  no: TarefaArvore;
  meuPapel: PapelGrupo | null;
  usuarioAtualId: string;
}): PermissoesNoGrupo {
  const podeSubnivel = no.profundidade < PROFUNDIDADE_MAXIMA;

  if (!raizArvore.compartilhada) {
    return {
      compartilhada: false,
      ehLider: true,
      podeEditar: true,
      podeConcluirOuReabrir: true,
      podeAdicionarSubtarefa: podeSubnivel,
      podeExcluir: true,
      podeGerenciarGrupo: false,
    };
  }

  const papelEfetivo = meuPapel ?? 'colaborador';
  if (papelEfetivo === 'lider') {
    return {
      compartilhada: true,
      ehLider: true,
      podeEditar: true,
      podeConcluirOuReabrir: true,
      podeAdicionarSubtarefa: podeSubnivel,
      podeExcluir: true,
      podeGerenciarGrupo: true,
    };
  }

  const noEscopo = noPertenceAoEscopoDoColaborador(raizArvore, no.id, usuarioAtualId);
  return {
    compartilhada: true,
    ehLider: false,
    podeEditar: noEscopo,
    podeConcluirOuReabrir: noEscopo,
    podeAdicionarSubtarefa: noEscopo && podeSubnivel,
    podeExcluir: noEscopo && no.id !== raizArvore.id,
    podeGerenciarGrupo: false,
  };
}

export function formatarHorarioAtividade(isoUtc: string): string {
  const data = new Date(isoUtc);
  if (Number.isNaN(data.getTime())) {
    return '';
  }
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${hora}:${min}`;
}

export function salvarConvitePendente(token: string): void {
  try {
    if (typeof sessionStorage !== 'undefined' && token.trim()) {
      sessionStorage.setItem(CHAVE_CONVITE_PENDENTE, token.trim());
    }
  } catch {
    // Armazenamento de sessao indisponivel.
  }
}

export function lerConvitePendente(): string | null {
  try {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(CHAVE_CONVITE_PENDENTE);
  } catch {
    return null;
  }
}

export function limparConvitePendente(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(CHAVE_CONVITE_PENDENTE);
    }
  } catch {
    // Armazenamento de sessao indisponivel.
  }
}
