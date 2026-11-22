import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { calcularPosicaoAstros } from '../../src/astronomia/ciclo-solar';
import { calcularFaseLunar } from '../../src/astronomia/fase-lunar';
import { calcularEstadoCromatico } from '../../src/astronomia/sistema-cromatico';
import { CenarioDoHorizonte } from '../../src/cenario/CenarioDoHorizonte';
import type { PropriedadesCena3D } from '../../src/cenario/logica-cena-3d';

const MINUTO_MANHA = 510;
const CROMATICO_MANHA = calcularEstadoCromatico(MINUTO_MANHA);
const ASTROS_MANHA = calcularPosicaoAstros(MINUTO_MANHA);
const FASE_LUNAR_BASE = calcularFaseLunar(new Date('2024-04-15T19:13:00Z'), 'sul');

describe('CenarioDoHorizonte - alternancia WebGL 3D e Fallback 2D', () => {
  it('monta cena 3D com WebGL disponivel e adapta perfil entre desktop e mobile', () => {
    const Duble3D = ({ perfil, estadoClimatico }: PropriedadesCena3D) => (
      <div
        data-testid="cena-3d-duble"
        data-perfil={perfil.perfil}
        data-estado-climatico={estadoClimatico}
      />
    );

    const { rerender } = render(
      <CenarioDoHorizonte
        qualidadePreferida="auto"
        suporteWebGL
        cromatico={CROMATICO_MANHA}
        astros={ASTROS_MANHA}
        faseLunar={FASE_LUNAR_BASE}
        estadoClimatico="limpo"
        reduzirMovimento={false}
        larguraViewport={1280}
        ComponenteCena3D={Duble3D}
      />,
    );

    expect(screen.getByTestId('cena-3d-duble')).toHaveAttribute(
      'data-perfil',
      'desktop_riqueza_maxima',
    );
    expect(screen.queryByTestId('cenario-fallback-2d')).not.toBeInTheDocument();

    rerender(
      <CenarioDoHorizonte
        qualidadePreferida="auto"
        suporteWebGL
        cromatico={CROMATICO_MANHA}
        astros={ASTROS_MANHA}
        faseLunar={FASE_LUNAR_BASE}
        estadoClimatico="chuvoso"
        reduzirMovimento={false}
        larguraViewport={390}
        ComponenteCena3D={Duble3D}
      />,
    );

    expect(screen.getByTestId('cena-3d-duble')).toHaveAttribute('data-perfil', 'mobile_adaptado');
    expect(screen.getByTestId('cena-3d-duble')).toHaveAttribute('data-estado-climatico', 'chuvoso');
  });

  it('desmonta cena 3D chamando cleanup e troca para Fallback 2D ao ativar desempenho ou movimento reduzido', () => {
    const aoDesmontar = vi.fn();
    const Duble3DComCleanup = () => {
      useEffect(() => {
        return () => {
          aoDesmontar();
        };
      }, []);
      return <div data-testid="cena-3d-duble" />;
    };

    const { rerender } = render(
      <CenarioDoHorizonte
        qualidadePreferida="auto"
        suporteWebGL
        cromatico={CROMATICO_MANHA}
        astros={ASTROS_MANHA}
        faseLunar={FASE_LUNAR_BASE}
        estadoClimatico="limpo"
        reduzirMovimento={false}
        larguraViewport={1280}
        ComponenteCena3D={Duble3DComCleanup}
      />,
    );

    expect(screen.getByTestId('cena-3d-duble')).toBeInTheDocument();

    rerender(
      <CenarioDoHorizonte
        qualidadePreferida="desempenho_2d"
        suporteWebGL
        cromatico={CROMATICO_MANHA}
        astros={ASTROS_MANHA}
        faseLunar={FASE_LUNAR_BASE}
        estadoClimatico="limpo"
        reduzirMovimento={false}
        larguraViewport={1280}
        ComponenteCena3D={Duble3DComCleanup}
      />,
    );

    expect(aoDesmontar).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('cena-3d-duble')).not.toBeInTheDocument();
    expect(screen.getByTestId('cenario-fallback-2d')).toBeInTheDocument();

    rerender(
      <CenarioDoHorizonte
        qualidadePreferida="auto"
        suporteWebGL
        cromatico={CROMATICO_MANHA}
        astros={ASTROS_MANHA}
        faseLunar={FASE_LUNAR_BASE}
        estadoClimatico="limpo"
        reduzirMovimento
        larguraViewport={1280}
        ComponenteCena3D={Duble3DComCleanup}
      />,
    );

    expect(screen.getByTestId('cenario-fallback-2d')).toBeInTheDocument();
  });

  it('recupera com Fallback 2D se perder contexto WebGL ou se cena 3D lancar erro', () => {
    const DublePerdaContexto = ({ aoPerderContextoWebGL }: PropriedadesCena3D) => (
      <button type="button" onClick={aoPerderContextoWebGL} data-testid="simular-perda-webgl">
        Perder WebGL
      </button>
    );

    const { unmount } = render(
      <CenarioDoHorizonte
        qualidadePreferida="auto"
        suporteWebGL
        cromatico={CROMATICO_MANHA}
        astros={ASTROS_MANHA}
        faseLunar={FASE_LUNAR_BASE}
        estadoClimatico="tempestade"
        reduzirMovimento={false}
        larguraViewport={1280}
        ComponenteCena3D={DublePerdaContexto}
      />,
    );

    fireEvent.click(screen.getByTestId('simular-perda-webgl'));
    expect(screen.getByTestId('cenario-fallback-2d')).toBeInTheDocument();
    unmount();

    const DubleQuebrado = (): never => {
      throw new Error('Falha WebGL simulada no teste');
    };

    const espiaoErro = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <CenarioDoHorizonte
          qualidadePreferida="auto"
          suporteWebGL
          cromatico={CROMATICO_MANHA}
          astros={ASTROS_MANHA}
          faseLunar={FASE_LUNAR_BASE}
          estadoClimatico="limpo"
          reduzirMovimento={false}
          larguraViewport={1280}
          ComponenteCena3D={DubleQuebrado}
        />,
      );
      expect(screen.getByTestId('cenario-fallback-2d')).toBeInTheDocument();
    } finally {
      espiaoErro.mockRestore();
    }
  });

  it('renderiza diretamente Fallback 2D quando WebGL nao e suportado sem montar cena 3D', () => {
    const DubleNaoChamado = vi.fn(() => <div data-testid="cena-3d-duble" />);

    render(
      <CenarioDoHorizonte
        qualidadePreferida="auto"
        suporteWebGL={false}
        cromatico={CROMATICO_MANHA}
        astros={ASTROS_MANHA}
        faseLunar={FASE_LUNAR_BASE}
        estadoClimatico="nublado"
        reduzirMovimento={false}
        larguraViewport={1280}
        ComponenteCena3D={DubleNaoChamado}
      />,
    );

    expect(DubleNaoChamado).not.toHaveBeenCalled();
    expect(screen.getByTestId('cenario-fallback-2d')).toHaveAttribute(
      'data-estado-climatico',
      'nublado',
    );
  });
});
