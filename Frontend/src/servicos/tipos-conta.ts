export type TipoAvatar = 'preset' | 'google' | 'upload';

export interface UsuarioConta {
  id: string;
  email: string;
  nomeExibicao: string;
  avatarTipo: TipoAvatar;
  avatarId: string | null;
  avatarUrl: string | null;
  primeiroAcessoConcluido: boolean;
}

export interface MetadadosSessao {
  expiraEm: string;
  expiracaoAbsolutaEm: string;
}

export type EstadoSessao =
  | {
      autenticado: true;
      usuario: UsuarioConta;
      sessao: MetadadosSessao;
    }
  | {
      autenticado: false;
      usuario: null;
      sessao: null;
    };

export interface EntradaPrimeiroAcesso {
  nomeExibicao: string;
  avatarTipo: TipoAvatar;
  avatarId: string | null;
  criarArvoreGuia: boolean;
}

export interface ResultadoPrimeiroAcesso {
  primeiroAcessoConcluido: boolean;
  arvoreGuiaCriada: boolean;
  tarefaGuiaId: string | null;
}

export interface EntradaAtualizarPerfil {
  nomeExibicao: string;
  avatarTipo: TipoAvatar;
  avatarId: string | null;
}

export interface ResultadoUploadAvatar {
  avatarTipo: TipoAvatar;
  avatarUrl: string;
  largura: number;
  altura: number;
}

export interface ResultadoExclusaoConta {
  contaExcluida: boolean;
  mensagem: string;
}

export interface ServicoAutenticacaoFrontend {
  consultarSessao(): Promise<EstadoSessao>;
  concluirPrimeiroAcesso(entrada: EntradaPrimeiroAcesso): Promise<ResultadoPrimeiroAcesso>;
  obterPerfil(): Promise<UsuarioConta>;
  atualizarPerfil(entrada: EntradaAtualizarPerfil): Promise<UsuarioConta>;
  enviarAvatar(arquivo: File): Promise<ResultadoUploadAvatar>;
  sair(): Promise<void>;
  sairTodos(): Promise<number>;
  excluirConta(confirmacao: string): Promise<ResultadoExclusaoConta>;
}
