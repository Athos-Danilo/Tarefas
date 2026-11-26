import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { calcularPosicaoAstros } from '../../src/astronomia/ciclo-solar';
import { calcularFaseLunar } from '../../src/astronomia/fase-lunar';
import { calcularEstadoCromatico } from '../../src/astronomia/sistema-cromatico';
import { CenarioFallback2D } from '../../src/cenario/CenarioFallback2D';
import { TourGuiadoLume } from '../../src/dominios/tutorial/TourGuiadoLume';
import type { ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
import type { ServicoJornadaFrontend } from '../../src/servicos/tipos-jornada';
import type { BuscadorDeSaude } from '../../src/servicos/tipos-saude';

const BUSCADOR_OK: BuscadorDeSaude = {
  consultarSaude: () =>
    Promise.resolve({
      status: 'ok',
      servico: 'lume-api',
      versao: '0.1.0',
      bancoRelacional: 'conectado',
      bancoDocumental: 'conectado',
      timestamp: '2026-11-26T15:00:00Z',
    }),
};

function criarAutenticacaoDuble(): ServicoAutenticacaoFrontend {
  return {
    consultarSessao: () =>
      Promise.resolve({
        autenticado: true,
        usuario: {
          id: 'u-audit-25',
          email: 'audit.25@lume.dev',
          nomeExibicao: 'Athos Audit',
          avatarTipo: 'preset',
          avatarId: 'sol-nascente',
          avatarUrl: '/assets-3d/avatares/sol-nascente.png',
          primeiroAcessoConcluido: true,
        },
        sessao: {
          expiraEm: '2026-12-03T15:00:00Z',
          expiracaoAbsolutaEm: '2026-12-26T15:00:00Z',
        },
      }),
    concluirPrimeiroAcesso: () =>
      Promise.resolve({
        primeiroAcessoConcluido: true,
        arvoreGuiaCriada: false,
        tarefaGuiaId: null,
      }),
    obterPerfil: () =>
      Promise.resolve({
        id: 'u-audit-25',
        email: 'audit.25@lume.dev',
        nomeExibicao: 'Athos Audit',
        avatarTipo: 'preset',
        avatarId: 'sol-nascente',
        avatarUrl: '/assets-3d/avatares/sol-nascente.png',
        primeiroAcessoConcluido: true,
      }),
    atualizarPerfil: () => Promise.reject(new Error('Nao usado')),
    enviarAvatar: () => Promise.reject(new Error('Nao usado')),
    sair: () => Promise.resolve(),
    sairTodos: () => Promise.resolve(1),
    excluirConta: () => Promise.resolve({ contaExcluida: true, mensagem: 'Excluida' }),
  };
}

function criarJornadaDubleMinimo(): ServicoJornadaFrontend {
  return {
    listarTarefas: () =>
      Promise.resolve({
        itens: [],
        totais: { ativas: 0, concluidas: 0, limiteAtivas: 500 },
      }),
    obterTarefa: () => Promise.reject(new Error('Nao usado')),
    criarTarefa: () => Promise.reject(new Error('Nao usado')),
    atualizarTarefa: () => Promise.reject(new Error('Nao usado')),
    concluirTarefa: () => Promise.reject(new Error('Nao usado')),
    desfazerCascata: () => Promise.reject(new Error('Nao usado')),
    reabrirTarefa: () => Promise.reject(new Error('Nao usado')),
    moverTarefa: () => Promise.reject(new Error('Nao usado')),
    reordenarIrmas: () => Promise.resolve(0),
    excluirTarefa: () => Promise.reject(new Error('Nao usado')),
    salvarDetalhes: () => Promise.reject(new Error('Nao usado')),
    listarEtiquetas: () => Promise.resolve({ itens: [], limiteMaximo: 30 }),
    criarEtiqueta: () => Promise.reject(new Error('Nao usado')),
    atualizarEtiqueta: () => Promise.reject(new Error('Nao usado')),
    excluirEtiqueta: () => Promise.resolve(),
    consultarClimaAtual: () => Promise.resolve({ autorizado: false, clima: null }),
    atualizarConsentimentoClima: () => Promise.reject(new Error('Nao usado')),
    buscarCidades: () => Promise.resolve([]),
  };
}

function WrapperRestauracaoFocoTour() {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir tour de teste
      </button>
      <TourGuiadoLume
        aberto={aberto}
        passoNumero={1}
        reduzirMovimento
        aoAvancar={vi.fn()}
        aoVoltar={vi.fn()}
        aoPular={() => setAberto(false)}
      />
    </div>
  );
}

describe('Fase 25 - Auditoria de Acessibilidade, Navegacao e Conforto Visual', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('expoe skip-link para #conteudo-principal, landmark main e aria-current na rota ativa', async () => {
    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAutenticacaoDuble()}
        servicoJornada={criarJornadaDubleMinimo()}
        rotaInicial="/jornada"
      />,
    );

    const linkPular = await screen.findByRole('link', {
      name: /pular para o conteúdo principal/i,
    });
    expect(linkPular).toHaveAttribute('href', '#conteudo-principal');

    const principal = screen.getByRole('main');
    expect(principal).toHaveAttribute('id', 'conteudo-principal');

    const linksJornada = screen.getAllByRole('link', { name: /jornada/i });
    expect(linksJornada.some((el) => el.getAttribute('aria-current') === 'page')).toBe(true);

    const linksMapa = screen.getAllByRole('link', { name: /mapa/i });
    expect(linksMapa.every((el) => el.getAttribute('aria-current') === null)).toBe(true);
  });

  it('restaura foco para o elemento disparador ao fechar TourGuiadoLume com Escape', async () => {
    const usuario = userEvent.setup();
    render(<WrapperRestauracaoFocoTour />);

    const btnDisparador = screen.getByRole('button', { name: /abrir tour de teste/i });
    await usuario.click(btnDisparador);

    const dialogo = await screen.findByRole('dialog', { name: /tour guiado do lume/i });
    await waitFor(() => {
      expect(dialogo).toHaveFocus();
    });

    await usuario.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(btnDisparador).toHaveFocus();
    });
  });

  it('mantem flashes de tempestade desligados no Fallback 2D quando reduzirMovimento esta ativo', () => {
    const minuto = 22 * 60;
    const cromatico = calcularEstadoCromatico(minuto);
    const astros = calcularPosicaoAstros(minuto);
    const faseLunar = calcularFaseLunar(new Date('2026-11-26T22:00:00Z'), 'sul');

    render(
      <CenarioFallback2D
        cromatico={cromatico}
        astros={astros}
        faseLunar={faseLunar}
        estadoClimatico="tempestade"
        reduzirMovimento
      />,
    );

    const cenario = screen.getByTestId('cenario-fallback-2d');
    expect(cenario).toHaveAttribute('data-flashes-ativos', 'false');
    expect(screen.queryByTestId('clarao-tempestade-2d')).not.toBeInTheDocument();
  });
});
