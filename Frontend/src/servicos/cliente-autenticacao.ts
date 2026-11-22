import { ErroApi, requisitarJson } from './cliente-http';
import type {
  EntradaAtualizarPerfil,
  EntradaPrimeiroAcesso,
  EstadoSessao,
  ResultadoExclusaoConta,
  ResultadoPrimeiroAcesso,
  ResultadoUploadAvatar,
  ServicoAutenticacaoFrontend,
  TipoAvatar,
  UsuarioConta,
} from './tipos-conta';

export const URL_LOGIN_GOOGLE = '/api/autenticacao/google/iniciar';

interface UsuarioResumoApi {
  id: string;
  email: string;
  nome_exibicao: string;
  avatar_tipo: TipoAvatar;
  avatar_id: string | null;
  avatar_url: string | null;
  primeiro_acesso_concluido: boolean;
}

interface RespostaSessaoApi {
  autenticado: boolean;
  usuario: UsuarioResumoApi;
  sessao: {
    expira_em: string;
    expiracao_absoluta_em: string;
  };
}

interface RespostaPrimeiroAcessoApi {
  primeiro_acesso_concluido: boolean;
  arvore_guia_criada: boolean;
  tarefa_guia_id: string | null;
}

interface RespostaAvatarApi {
  avatar_tipo: TipoAvatar;
  avatar_url: string;
  largura: number;
  altura: number;
}

interface RespostaSairTodosApi {
  sessoes_revogadas: number;
}

interface RespostaExcluirApi {
  conta_excluida: boolean;
  mensagem: string;
}

function mapearUsuario(dados: UsuarioResumoApi): UsuarioConta {
  return {
    id: dados.id,
    email: dados.email,
    nomeExibicao: dados.nome_exibicao,
    avatarTipo: dados.avatar_tipo,
    avatarId: dados.avatar_id,
    avatarUrl: dados.avatar_url,
    primeiroAcessoConcluido: dados.primeiro_acesso_concluido,
  };
}

export function criarServicoAutenticacao(
  funcaoFetch: typeof fetch = fetch,
): ServicoAutenticacaoFrontend {
  return {
    async consultarSessao(): Promise<EstadoSessao> {
      try {
        const dados = await requisitarJson<RespostaSessaoApi>(
          '/api/autenticacao/sessao',
          { method: 'GET' },
          funcaoFetch,
        );
        return {
          autenticado: true,
          usuario: mapearUsuario(dados.usuario),
          sessao: {
            expiraEm: dados.sessao.expira_em,
            expiracaoAbsolutaEm: dados.sessao.expiracao_absoluta_em,
          },
        };
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 401) {
          return {
            autenticado: false,
            usuario: null,
            sessao: null,
          };
        }
        throw erro;
      }
    },

    async concluirPrimeiroAcesso(entrada: EntradaPrimeiroAcesso): Promise<ResultadoPrimeiroAcesso> {
      const dados = await requisitarJson<RespostaPrimeiroAcessoApi>(
        '/api/conta/primeiro-acesso',
        {
          method: 'POST',
          body: JSON.stringify({
            nome_exibicao: entrada.nomeExibicao,
            avatar_tipo: entrada.avatarTipo,
            avatar_id: entrada.avatarId,
            criar_arvore_guia: entrada.criarArvoreGuia,
          }),
        },
        funcaoFetch,
      );
      return {
        primeiroAcessoConcluido: dados.primeiro_acesso_concluido,
        arvoreGuiaCriada: dados.arvore_guia_criada,
        tarefaGuiaId: dados.tarefa_guia_id,
      };
    },

    async obterPerfil(): Promise<UsuarioConta> {
      const dados = await requisitarJson<UsuarioResumoApi>(
        '/api/conta/perfil',
        { method: 'GET' },
        funcaoFetch,
      );
      return mapearUsuario(dados);
    },

    async atualizarPerfil(entrada: EntradaAtualizarPerfil): Promise<UsuarioConta> {
      const dados = await requisitarJson<UsuarioResumoApi>(
        '/api/conta/perfil',
        {
          method: 'PATCH',
          body: JSON.stringify({
            nome_exibicao: entrada.nomeExibicao,
            avatar_tipo: entrada.avatarTipo,
            avatar_id: entrada.avatarId,
          }),
        },
        funcaoFetch,
      );
      return mapearUsuario(dados);
    },

    async enviarAvatar(arquivo: File): Promise<ResultadoUploadAvatar> {
      const formulario = new FormData();
      formulario.append('arquivo', arquivo);

      const dados = await requisitarJson<RespostaAvatarApi>(
        '/api/conta/avatar',
        {
          method: 'POST',
          body: formulario,
        },
        funcaoFetch,
      );
      return {
        avatarTipo: dados.avatar_tipo,
        avatarUrl: dados.avatar_url,
        largura: dados.largura,
        altura: dados.altura,
      };
    },

    async sair(): Promise<void> {
      await requisitarJson<void>('/api/autenticacao/sair', { method: 'POST' }, funcaoFetch);
    },

    async sairTodos(): Promise<number> {
      const dados = await requisitarJson<RespostaSairTodosApi>(
        '/api/autenticacao/sair-todos',
        { method: 'POST' },
        funcaoFetch,
      );
      return dados.sessoes_revogadas;
    },

    async excluirConta(confirmacao: string): Promise<ResultadoExclusaoConta> {
      const dados = await requisitarJson<RespostaExcluirApi>(
        '/api/conta/excluir',
        {
          method: 'POST',
          body: JSON.stringify({ confirmacao }),
        },
        funcaoFetch,
      );
      return {
        contaExcluida: dados.conta_excluida,
        mensagem: dados.mensagem,
      };
    },
  };
}
