import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { useMotorTemporal } from '../../src/astronomia/motor-temporal';
import { TextoEscrito } from '../../src/componentes/animacoes/TextoEscrito';
import { BadgePrioridade } from '../../src/componentes/BadgePrioridade';
import { ModalAcessivel } from '../../src/componentes/ModalAcessivel';
import type { BuscadorDeSaude, EstadoSaudeApi } from '../../src/servicos/tipos-saude';

const SAUDE_SIMULADA: EstadoSaudeApi = {
  status: 'ok',
  servico: 'lume-api',
  versao: '0.1.0',
  bancoRelacional: 'conectado',
  bancoDocumental: 'conectado',
  timestamp: '2026-11-22T14:00:00Z',
};

describe('Sistema visual adaptativo, Fallback 2D e componentes acessiveis', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <link id="favicon-ativo" rel="icon" href="/favicons/favicon-lume-manha.png" />
      <meta id="meta-theme-color" name="theme-color" content="#256B4E" />
    `;
    useMotorTemporal.getState().ativarRelogioReal();
    useMotorTemporal.getState().definirClimaSimulado('automatico');
    useMotorTemporal.getState().definirQualidade3D('auto');
    useMotorTemporal.getState().definirMovimentoReduzido(false);
  });

  afterEach(() => {
    useMotorTemporal.getState().ativarRelogioReal();
    useMotorTemporal.getState().definirClimaSimulado('automatico');
    useMotorTemporal.getState().definirQualidade3D('auto');
    useMotorTemporal.getState().definirMovimentoReduzido(false);
  });

  it('alterna momentos do dia, atualiza tokens CSS, favicon e exibe Lua real no Fallback 2D', async () => {
    const usuario = userEvent.setup();
    const buscador: BuscadorDeSaude = {
      consultarSaude: vi.fn().mockResolvedValue(SAUDE_SIMULADA),
    };

    render(<Aplicacao buscadorDeSaude={buscador} />);
    await screen.findByText(/lume-api/i);

    const cenario = screen.getByTestId('cenario-fallback-2d');
    const favicon = document.getElementById('favicon-ativo') as HTMLLinkElement;

    await usuario.click(screen.getByRole('button', { name: /manhã/i }));
    expect(document.documentElement.dataset.polaridade).toBe('clara');
    expect(document.documentElement.style.getPropertyValue('--primaria')).not.toBe('');
    expect(favicon.getAttribute('href')).toBe('/favicons/favicon-lume-manha.png');
    expect(cenario).toHaveAttribute('data-sol-visivel', 'true');
    expect(cenario).toHaveAttribute('data-lua-visivel', 'false');

    await usuario.click(screen.getByRole('button', { name: /tarde/i }));
    expect(document.documentElement.dataset.polaridade).toBe('clara');
    expect(favicon.getAttribute('href')).toBe('/favicons/favicon-lume-tarde.png');

    await usuario.click(screen.getByRole('button', { name: /crepúsculo/i }));
    expect(document.documentElement.dataset.polaridade).toBe('escura');
    expect(favicon.getAttribute('href')).toBe('/favicons/favicon-lume-entardecer.png');

    await usuario.click(screen.getByRole('button', { name: /^noite$/i }));
    expect(document.documentElement.dataset.polaridade).toBe('escura');
    expect(favicon.getAttribute('href')).toBe('/favicons/favicon-lume-noite.png');
    expect(cenario).toHaveAttribute('data-sol-visivel', 'false');
    expect(cenario).toHaveAttribute('data-lua-visivel', 'true');

    const luaImg = screen.getByRole('img', { name: /hemisfério sul/i });
    expect(luaImg).toBeInTheDocument();
  });

  it('alterna os 5 estados climaticos e desliga claroes de tempestade com movimento reduzido', async () => {
    const usuario = userEvent.setup();
    const buscador: BuscadorDeSaude = {
      consultarSaude: vi.fn().mockResolvedValue(SAUDE_SIMULADA),
    };

    render(<Aplicacao buscadorDeSaude={buscador} />);
    await screen.findByText(/lume-api/i);

    const cenario = screen.getByTestId('cenario-fallback-2d');

    await usuario.click(screen.getByRole('button', { name: /^limpo$/i }));
    expect(cenario).toHaveAttribute('data-estado-climatico', 'limpo');

    await usuario.click(screen.getByRole('button', { name: /parcialmente nublado/i }));
    expect(cenario).toHaveAttribute('data-estado-climatico', 'parcialmente_nublado');
    expect(screen.getByTestId('camada-nuvens-2d')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /^nublado$/i }));
    expect(cenario).toHaveAttribute('data-estado-climatico', 'nublado');

    await usuario.click(screen.getByRole('button', { name: /chuvoso/i }));
    expect(cenario).toHaveAttribute('data-estado-climatico', 'chuvoso');
    expect(screen.getByTestId('camada-chuva-2d')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /tempestade/i }));
    expect(cenario).toHaveAttribute('data-estado-climatico', 'tempestade');
    expect(cenario).toHaveAttribute('data-flashes-ativos', 'true');

    await usuario.click(screen.getByRole('switch', { name: /reduzir movimento/i }));
    expect(cenario).toHaveAttribute('data-flashes-ativos', 'false');
  });

  it('renderiza TextoEscrito completo com movimento reduzido, BadgePrioridade e ModalAcessivel', async () => {
    const usuario = userEvent.setup();

    render(
      <div>
        <TextoEscrito texto="Manhã viva no Lume" reduzirMovimento />
        <BadgePrioridade prioridade="baixa" />
        <BadgePrioridade prioridade="media" />
        <BadgePrioridade prioridade="alta" />
        <BadgePrioridade prioridade="urgente" />
        <ModalAcessivel
          titulo="Configurar horizonte"
          descricao="Ajuste preferencias do cenario."
          gatilho={<button type="button">Abrir modal de teste</button>}
        >
          <p>Conteudo interno do modal</p>
        </ModalAcessivel>
      </div>,
    );

    expect(screen.getByText('Manhã viva no Lume')).toBeInTheDocument();
    expect(screen.getByText('● Baixa')).toBeInTheDocument();
    expect(screen.getByText('▲ Média')).toBeInTheDocument();
    expect(screen.getByText('◆ Alta')).toBeInTheDocument();
    expect(screen.getByText('★ Urgente')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /abrir modal de teste/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/conteudo interno do modal/i)).toBeInTheDocument();

    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
