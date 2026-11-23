import type { TarefaArvore } from './tipos-jornada';

export type PapelGrupo = 'lider' | 'colaborador';

export interface ResultadoCompartilharGrupo {
  tarefaRaizId: string;
  compartilhada: boolean;
  meuPapel: PapelGrupo;
  codigoToken: string;
  linkConvite: string;
}

export interface VagaGrupo {
  id: string;
  tarefaRaizId: string;
  nomeExibicao: string;
  emailOpcional: string | null;
  ocupadaPorUsuarioId: string | null;
  criadaEm: string;
}

export interface ResultadoRegenerarConvite {
  codigoToken: string;
  linkConvite: string;
  ativo: boolean;
}

export interface MembroPreviaConvite {
  usuarioId: string;
  nomeExibicao: string;
  avatarUrl: string | null;
  papel: PapelGrupo;
}

export interface VagaDisponivelPrevia {
  id: string;
  nomeExibicao: string;
  emailOpcional: string | null;
}

export interface PreviaConviteGrupo {
  tarefaRaizId: string;
  titulo: string;
  liderNome: string;
  membrosAtivos: MembroPreviaConvite[];
  vagasDisponiveis: VagaDisponivelPrevia[];
  jaEMembro: boolean;
}

export interface EntrarConviteResposta {
  tarefaRaizId: string;
  papel: PapelGrupo;
  vagaVinculadaId: string | null;
  subtarefasHerdadas: number;
  jaEraMembro: boolean;
}

export interface IntegrantePainelGrupo {
  usuarioId: string;
  nomeExibicao: string;
  papel: PapelGrupo;
  avatarUrl: string | null;
  atribuidas: number;
  concluidas: number;
  percentual: number;
}

export interface VagaAbertaPainelGrupo {
  vagaId: string;
  nomeExibicao: string;
  emailOpcional: string | null;
  atribuidas: number;
}

export interface AtividadeGrupo {
  eventoId: string;
  autorNome: string;
  tipoEvento: string;
  resumo: string;
  criadoEm: string;
}

export interface PainelDesempenhoGrupo {
  tarefaRaizId: string;
  titulo: string;
  meuPapel: PapelGrupo;
  linkConviteAtivo: boolean;
  codigoToken: string | null;
  resumoGeral: {
    totalSubtarefasFolha: number;
    folhasConcluidas: number;
    percentualGeral: number;
  };
  integrantes: IntegrantePainelGrupo[];
  vagasAbertas: VagaAbertaPainelGrupo[];
  atividadeRecente: AtividadeGrupo[];
}

export interface ResultadoTransferirLideranca {
  liderancaTransferida: boolean;
  novoLiderUsuarioId: string;
}

export interface ResultadoSairGrupo {
  saiuDoGrupo: boolean;
  subtarefasDesvinculadas: number;
}

export interface EntradaAtribuirResponsavel {
  responsavelUsuarioId?: string | null;
  vagaResponsavelId?: string | null;
}

export interface ServicoGruposFrontend {
  compartilharTarefa: (tarefaRaizId: string) => Promise<ResultadoCompartilharGrupo>;
  criarVaga: (
    tarefaRaizId: string,
    entrada: { nomeExibicao: string; emailOpcional?: string | null },
  ) => Promise<VagaGrupo>;
  excluirVaga: (tarefaRaizId: string, vagaId: string) => Promise<void>;
  regenerarConvite: (tarefaRaizId: string) => Promise<ResultadoRegenerarConvite>;
  revogarConvites: (tarefaRaizId: string) => Promise<void>;
  obterPreviaConvite: (token: string) => Promise<PreviaConviteGrupo>;
  entrarPorConvite: (token: string, vagaId: string | null) => Promise<EntrarConviteResposta>;
  atribuirResponsavel: (
    tarefaId: string,
    entrada: EntradaAtribuirResponsavel,
  ) => Promise<TarefaArvore>;
  obterDesempenhoGrupo: (tarefaRaizId: string) => Promise<PainelDesempenhoGrupo>;
  transferirLideranca: (
    tarefaRaizId: string,
    novoLiderUsuarioId: string,
  ) => Promise<ResultadoTransferirLideranca>;
  removerMembro: (tarefaRaizId: string, usuarioId: string) => Promise<void>;
  sairDoGrupo: (tarefaRaizId: string) => Promise<ResultadoSairGrupo>;
}
