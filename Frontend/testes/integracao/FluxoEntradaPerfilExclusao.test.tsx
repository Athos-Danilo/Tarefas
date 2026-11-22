import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { useMotorTemporal } from '../../src/astronomia/motor-temporal';
import type {
  EstadoSessao,
  ServicoAutenticacaoFrontend,
  UsuarioConta,
} from '../../src/servicos/tipos-conta';
import type { BuscadorDeSaude, EstadoSaudeApi } from '../../src/servicos/tipos-saude';

const SAUDE_OK: EstadoSaudeApi = {
  status: 'ok',
  servico: 'lume-api',
  versao: '0.1.0',
  bancoRelacional: 'conectado',
  bancoDocumental: 'conectado',
  timestamp: '2026-11-22T17:30:00Z',
};

const BUSCADOR_OK: BuscadorDeSaude = {
  consultarSaude: vi.fn().mockResolvedValue(SAUDE_OK),
};

function criarServicoDuble(sessaoInicial: EstadoSessao): {
  servico: ServicoAutenticacaoFrontend;
  spies: {
    concluirPrimeiroAcesso: ReturnType<typeof vi.fn>;
    atualizarPerfil: ReturnType<typeof vi.fn>;
    enviarAvatar: ReturnType<typeof vi.fn>;
    sair: ReturnType<typeof vi.fn>;
    sairTodos: ReturnType<typeof vi.fn>;
    excluirConta: ReturnType<typeof vi.fn>;
  };
} {
  let sessaoAtual = sessaoInicial;

  const concluirPrimeiroAcesso = vi.fn(
    (entrada: {
      nomeExibicao: string;
      avatarTipo: 'preset' | 'google' | 'upload';
      avatarId: string | null;
      criarArvoreGuia: boolean;
    }) => {
      if (sessaoAtual.autenticado) {
        sessaoAtual = {
          ...sessaoAtual,
          usuario: {
            ...sessaoAtual.usuario,
            nomeExibicao: entrada.nomeExibicao,
            avatarTipo: entrada.avatarTipo,
            avatarId: entrada.avatarId,
            avatarUrl:
              entrada.avatarTipo === 'preset' && entrada.avatarId
                ? `/assets-3d/avatares/${entrada.avatarId}.png`
                : sessaoAtual.usuario.avatarUrl,
            primeiroAcessoConcluido: true,
          },
        };
      }
      return Promise.resolve({
        primeiroAcessoConcluido: true,
        arvoreGuiaCriada: entrada.criarArvoreGuia,
        tarefaGuiaId: entrada.criarArvoreGuia ? 'guia-1' : null,
      });
    },
  );

  const atualizarPerfil = vi.fn(
    (entrada: {
      nomeExibicao: string;
      avatarTipo: 'preset' | 'google' | 'upload';
      avatarId: string | null;
    }): Promise<UsuarioConta> => {
      if (!sessaoAtual.autenticado) {
        return Promise.reject(new Error('Sessao ausente'));
      }
      const atualizado: UsuarioConta = {
        ...sessaoAtual.usuario,
        nomeExibicao: entrada.nomeExibicao,
        avatarTipo: entrada.avatarTipo,
        avatarId: entrada.avatarId,
        avatarUrl:
          entrada.avatarTipo === 'preset' && entrada.avatarId
            ? `/assets-3d/avatares/${entrada.avatarId}.png`
            : '/api/conta/avatar/atual?v=1',
      };
      sessaoAtual = { ...sessaoAtual, usuario: atualizado };
      return Promise.resolve(atualizado);
    },
  );

  const enviarAvatar = vi.fn(() =>
    Promise.resolve({
      avatarTipo: 'upload' as const,
      avatarUrl: '/api/conta/avatar/atual?v=99',
      largura: 256,
      altura: 256,
    }),
  );

  const sair = vi.fn(() => {
    sessaoAtual = { autenticado: false, usuario: null, sessao: null };
    return Promise.resolve();
  });

  const sairTodos = vi.fn(() => {
    sessaoAtual = { autenticado: false, usuario: null, sessao: null };
    return Promise.resolve(2);
  });

  const excluirConta = vi.fn(() => {
    sessaoAtual = { autenticado: false, usuario: null, sessao: null };
    return Promise.resolve({
      contaExcluida: true,
      mensagem: 'Conta e todos os dados pessoais removidos em definitivo.',
    });
  });

  const servico: ServicoAutenticacaoFrontend = {
    consultarSessao: vi.fn(() => Promise.resolve(sessaoAtual)),
    concluirPrimeiroAcesso,
    obterPerfil: vi.fn(() => {
      if (!sessaoAtual.autenticado) {
        return Promise.reject(new Error('Nao autenticado'));
      }
      return Promise.resolve(sessaoAtual.usuario);
    }),
    atualizarPerfil,
    enviarAvatar,
    sair,
    sairTodos,
    excluirConta,
  };

  return {
    servico,
    spies: {
      concluirPrimeiroAcesso,
      atualizarPerfil,
      enviarAvatar,
      sair,
      sairTodos,
      excluirConta,
    },
  };
}

const SESSAO_PENDENTE: EstadoSessao = {
  autenticado: true,
  usuario: {
    id: 'usr-1',
    email: 'athos.lume@exemplo.com',
    nomeExibicao: 'Athos Google',
    avatarTipo: 'preset',
    avatarId: 'sol-nascente',
    avatarUrl: '/assets-3d/avatares/sol-nascente.png',
    primeiroAcessoConcluido: false,
  },
  sessao: {
    expiraEm: '2026-11-29T17:30:00Z',
    expiracaoAbsolutaEm: '2026-12-22T17:30:00Z',
  },
};

const SESSAO_CONCLUIDA: EstadoSessao = {
  autenticado: true,
  usuario: {
    ...SESSAO_PENDENTE.usuario,
    nomeExibicao: 'Athos Danilo',
    primeiroAcessoConcluido: true,
  },
  sessao: SESSAO_PENDENTE.sessao,
};

describe('Fase 15 - Landing, Primeiro Acesso, Perfil e Exclusao de Conta', () => {
  beforeEach(() => {
    useMotorTemporal.getState().ativarRelogioReal();
    useMotorTemporal.getState().definirClimaSimulado('automatico');
    useMotorTemporal.getState().definirQualidade3D('auto');
    useMotorTemporal.getState().definirMovimentoReduzido(false);
  });

  it('exibe Landing cinematografica e permite testar demo local sem gravar no servidor', async () => {
    const usuario = userEvent.setup();
    const { servico, spies } = criarServicoDuble({
      autenticado: false,
      usuario: null,
      sessao: null,
    });

    render(
      <Aplicacao buscadorDeSaude={BUSCADOR_OK} servicoAutenticacao={servico} rotaInicial="/" />,
    );

    const linksGoogle = await screen.findAllByRole('link', { name: /entrar com google/i });
    expect(linksGoogle.length).toBeGreaterThanOrEqual(1);
    expect(linksGoogle[0]).toHaveAttribute('href', '/api/autenticacao/google/iniciar');
    expect(screen.getByText(/demonstração local sem gravação/i)).toBeInTheDocument();

    expect(screen.getByText('★ Filha urgente em aberto')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();

    const checkboxUrgente = screen.getByRole('checkbox', { name: /revisar acessibilidade/i });
    await usuario.click(checkboxUrgente);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('★ Filha urgente em aberto')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /reiniciar demonstração/i }));
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(spies.concluirPrimeiroAcesso).not.toHaveBeenCalled();
  });

  it('bloqueia rotas protegidas para visitante anonimo redirecionando para a Landing', async () => {
    const anonimo: EstadoSessao = { autenticado: false, usuario: null, sessao: null };

    for (const rota of ['/jornada', '/perfil', '/primeiro-acesso']) {
      const { servico } = criarServicoDuble(anonimo);
      const { unmount } = render(
        <Aplicacao
          buscadorDeSaude={BUSCADOR_OK}
          servicoAutenticacao={servico}
          rotaInicial={rota}
        />,
      );

      expect(await screen.findAllByRole('link', { name: /entrar com google/i })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: /meu perfil/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /boas-vindas ao lume/i }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it('redireciona conta pendente para /primeiro-acesso, valida nome e conclui entrada para /jornada', async () => {
    const usuario = userEvent.setup();
    const { servico, spies } = criarServicoDuble(SESSAO_PENDENTE);

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={servico}
        rotaInicial="/jornada"
      />,
    );

    const campoNome = await screen.findByLabelText(/nome de exibição/i);
    expect(campoNome).toHaveValue('Athos Google');

    const checkGuia = screen.getByRole('checkbox', {
      name: /criar árvore-guia de boas-vindas editável/i,
    });
    expect(checkGuia).toBeChecked();

    await usuario.clear(campoNome);
    await usuario.type(campoNome, 'A');
    await usuario.click(screen.getByRole('button', { name: /começar minha jornada/i }));

    expect(await screen.findByText(/entre 2 e 60 caracteres/i)).toBeInTheDocument();
    expect(spies.concluirPrimeiroAcesso).not.toHaveBeenCalled();

    await usuario.type(campoNome, 'thos Silva');
    await usuario.click(screen.getByRole('button', { name: /vagalume estelar/i }));
    await usuario.click(screen.getByRole('button', { name: /começar minha jornada/i }));

    await waitFor(() => {
      expect(spies.concluirPrimeiroAcesso).toHaveBeenCalledWith({
        nomeExibicao: 'Athos Silva',
        avatarTipo: 'preset',
        avatarId: 'vagalume-estelar',
        criarArvoreGuia: true,
      });
    });

    expect(await screen.findByRole('heading', { name: /olá, athos silva/i })).toBeInTheDocument();
  });

  it('permite editar perfil, enviar avatar, rever tutorial, sair de todos e excluir conta com EXCLUIR', async () => {
    const usuario = userEvent.setup();
    const { servico, spies } = criarServicoDuble(SESSAO_CONCLUIDA);

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={servico}
        rotaInicial="/perfil"
      />,
    );

    const campoEmail = await screen.findByLabelText(/e-mail google vinculado/i);
    expect(campoEmail).toHaveValue('athos.lume@exemplo.com');
    expect(campoEmail).toHaveAttribute('readonly');

    const campoNome = screen.getByLabelText(/nome de exibição/i);
    await usuario.clear(campoNome);
    await usuario.type(campoNome, 'Athos Lume');
    await usuario.click(screen.getByRole('button', { name: /estrela guia/i }));
    await usuario.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(spies.atualizarPerfil).toHaveBeenCalledWith({
        nomeExibicao: 'Athos Lume',
        avatarTipo: 'preset',
        avatarId: 'estrela-guia',
      });
    });
    expect(await screen.findByText(/perfil atualizado com sucesso/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole('tab', { name: /enviar imagem própria/i }));
    const inputArquivo = screen.getByLabelText(/arquivo de avatar/i);
    const arquivoPng = new File([new Uint8Array(128)], 'meu-avatar.png', { type: 'image/png' });
    await usuario.upload(inputArquivo, arquivoPng);

    await waitFor(() => {
      expect(spies.enviarAvatar).toHaveBeenCalledWith(arquivoPng);
    });

    await usuario.click(screen.getByRole('button', { name: /rever tutorial/i }));
    expect(await screen.findByText(/modo tutorial marcado para exibição/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /excluir minha conta/i }));
    const campoExcluir = await screen.findByLabelText(/digite excluir para confirmar/i);
    const btnConfirmarExclusao = screen.getByRole('button', {
      name: /confirmar exclusão definitiva/i,
    });
    expect(btnConfirmarExclusao).toBeDisabled();

    await usuario.type(campoExcluir, 'excluir');
    expect(btnConfirmarExclusao).toBeDisabled();

    await usuario.clear(campoExcluir);
    await usuario.type(campoExcluir, 'EXCLUIR');
    expect(btnConfirmarExclusao).toBeEnabled();
    await usuario.click(btnConfirmarExclusao);

    await waitFor(() => {
      expect(spies.excluirConta).toHaveBeenCalledWith('EXCLUIR');
    });
    expect(await screen.findAllByRole('link', { name: /entrar com google/i })).toBeTruthy();
  });

  it('permite sair de todos os aparelhos a partir do perfil voltando para a Landing', async () => {
    const usuario = userEvent.setup();
    const { servico, spies } = criarServicoDuble(SESSAO_CONCLUIDA);

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={servico}
        rotaInicial="/perfil"
      />,
    );

    const btnSairTodos = await screen.findByRole('button', { name: /sair de todos os aparelhos/i });
    await usuario.click(btnSairTodos);

    await waitFor(() => {
      expect(spies.sairTodos).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findAllByRole('link', { name: /entrar com google/i })).toBeTruthy();
  });
});
