import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import type { BuscadorDeSaude, EstadoSaudeApi } from '../../src/servicos/tipos-saude';

const SAUDAVEL_EXEMPLO: EstadoSaudeApi = {
  status: 'ok',
  servico: 'lume-api',
  versao: '0.1.0',
  bancoRelacional: 'nao_configurado',
  bancoDocumental: 'nao_configurado',
  timestamp: '2026-11-21T14:30:00Z',
};

describe('Aplicacao - comunicacao inicial com /api/saude', () => {
  it('exibe estado de carregamento e depois os dados reais da API', async () => {
    let resolver!: (valor: EstadoSaudeApi) => void;
    const buscadorPendente: BuscadorDeSaude = {
      consultarSaude: vi.fn(
        () =>
          new Promise<EstadoSaudeApi>((resolve) => {
            resolver = resolve;
          }),
      ),
    };

    render(<Aplicacao buscadorDeSaude={buscadorPendente} />);

    expect(screen.getByText(/verificando conexão com a api/i)).toBeInTheDocument();

    resolver(SAUDAVEL_EXEMPLO);

    expect(await screen.findByText(/lume-api/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
    expect(screen.getAllByText(/não configurado/i)).toHaveLength(2);
  });

  it('mostra alerta acessivel quando a API falha e permite tentar novamente', async () => {
    const usuario = userEvent.setup();
    const consultarSaude = vi
      .fn<() => Promise<EstadoSaudeApi>>()
      .mockRejectedValueOnce(new Error('Falha de rede simulada'))
      .mockResolvedValueOnce(SAUDAVEL_EXEMPLO);

    render(<Aplicacao buscadorDeSaude={{ consultarSaude }} />);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/falha de rede simulada/i);

    await usuario.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByText(/lume-api/i)).toBeInTheDocument();
    expect(consultarSaude).toHaveBeenCalledTimes(2);
  });
});
