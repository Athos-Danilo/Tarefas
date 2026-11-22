import { afterEach, describe, expect, it, vi } from 'vitest';
import { obterEstadoClimaticoEfetivo, useMotorTemporal } from '../../src/astronomia/motor-temporal';
import {
  calcularContrasteWcag,
  calcularEstadoCromatico,
} from '../../src/astronomia/sistema-cromatico';
import { resolverModoRenderizacao } from '../../src/cenario/detector-capacidade';
import { criarControladorFavicon } from '../../src/estilos/controlador-favicon';
import { registrarServiceWorker } from '../../src/pwa/registro-sw';

describe('Sistema cromatico 24h, controlador de favicons, motor temporal e PWA', () => {
  afterEach(() => {
    useMotorTemporal.getState().ativarRelogioReal();
    useMotorTemporal.getState().definirClimaSimulado('automatico');
    useMotorTemporal.getState().definirEstadoClimaticoReal('limpo');
    useMotorTemporal.getState().definirQualidade3D('auto');
    useMotorTemporal.getState().definirMovimentoReduzido(false);
  });

  it('garante contraste WCAG AA (>= 4.5:1) em todos os 1440 minutos e polaridades exatas', () => {
    for (let minuto = 0; minuto < 1440; minuto += 1) {
      const estado = calcularEstadoCromatico(minuto);

      expect(calcularContrasteWcag(estado.texto, estado.superficieSolida)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        calcularContrasteWcag(estado.textoSec, estado.superficieSolida),
      ).toBeGreaterThanOrEqual(4.5);
      expect(calcularContrasteWcag(estado.primariaTexto, estado.primaria)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        calcularContrasteWcag(estado.prioBaixa, estado.superficieSolida),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        calcularContrasteWcag(estado.prioMedia, estado.superficieSolida),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        calcularContrasteWcag(estado.prioAlta, estado.superficieSolida),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        calcularContrasteWcag(estado.prioUrgente, estado.superficieSolida),
      ).toBeGreaterThanOrEqual(4.5);
    }

    expect(calcularEstadoCromatico(344).polaridade).toBe('escura');
    expect(calcularEstadoCromatico(345).polaridade).toBe('clara');
    expect(calcularEstadoCromatico(1049).polaridade).toBe('clara');
    expect(calcularEstadoCromatico(1050).polaridade).toBe('escura');
  });

  it('atualiza o favicon e meta theme-color apenas quando muda a faixa horaria', () => {
    document.head.innerHTML = `
      <link id="favicon-ativo" rel="icon" href="/favicons/favicon-lume-noite.png" />
      <meta id="meta-theme-color" name="theme-color" content="#0B1226" />
    `;
    const link = document.getElementById('favicon-ativo') as HTMLLinkElement;
    const meta = document.getElementById('meta-theme-color') as HTMLMetaElement;
    const spyHref = vi.spyOn(link, 'setAttribute');

    const controlador = criarControladorFavicon(document);

    expect(controlador.sincronizarPorMinuto(345, '#8A3E52')).toBe(true);
    expect(link.getAttribute('href')).toBe('/favicons/favicon-lume-manha.png');
    expect(meta.getAttribute('content')).toBe('#8A3E52');

    expect(controlador.sincronizarPorMinuto(450, '#256B4E')).toBe(false);
    expect(controlador.sincronizarPorMinuto(600, '#1E6663')).toBe(false);
    expect(controlador.sincronizarPorMinuto(719, '#1F6A73')).toBe(false);
    expect(spyHref).toHaveBeenCalledTimes(1);

    expect(controlador.sincronizarPorMinuto(720, '#A94F0D')).toBe(true);
    expect(link.getAttribute('href')).toBe('/favicons/favicon-lume-tarde.png');
    expect(meta.getAttribute('content')).toBe('#A94F0D');

    expect(controlador.sincronizarPorMinuto(1020, '#9C3E32')).toBe(true);
    expect(link.getAttribute('href')).toBe('/favicons/favicon-lume-entardecer.png');
    expect(meta.getAttribute('content')).toBe('#9C3E32');

    expect(controlador.sincronizarPorMinuto(1140, '#F5D076')).toBe(true);
    expect(link.getAttribute('href')).toBe('/favicons/favicon-lume-noite.png');
    expect(meta.getAttribute('content')).toBe('#F5D076');
  });

  it('controla o motor temporal entre relogio real, simulador e clima simulado', () => {
    const inicial = useMotorTemporal.getState();
    expect(inicial.modoTemporal).toBe('relogio_real');
    expect(inicial.climaSimulado).toBe('automatico');
    expect(inicial.estadoClimaticoReal).toBe('limpo');

    inicial.definirMinutoSimulado(900);
    expect(useMotorTemporal.getState().modoTemporal).toBe('simulador');
    expect(useMotorTemporal.getState().minutoSimulado).toBe(900);

    useMotorTemporal.getState().definirMinutoSimulado(1435);
    useMotorTemporal.getState().avancarMinutoSimulado(10);
    expect(useMotorTemporal.getState().minutoSimulado).toBe(5);

    useMotorTemporal.getState().selecionarMomento('crepusculo');
    expect(useMotorTemporal.getState().minutoSimulado).toBe(1065);

    useMotorTemporal.getState().definirClimaSimulado('chuvoso');
    expect(obterEstadoClimaticoEfetivo(useMotorTemporal.getState())).toBe('chuvoso');

    useMotorTemporal.getState().ativarRelogioReal();
    expect(useMotorTemporal.getState().modoTemporal).toBe('relogio_real');
  });

  it('resolve modo de renderizacao entre WebGL 3D e Fallback 2D e registra Service Worker', async () => {
    expect(
      resolverModoRenderizacao({
        qualidadePreferida: 'desempenho_2d',
        movimentoReduzido: false,
        suporteWebGL: true,
      }),
    ).toEqual({ modo: 'fallback_2d', motivo: 'preferencia_usuario' });

    expect(
      resolverModoRenderizacao({
        qualidadePreferida: 'auto',
        movimentoReduzido: true,
        suporteWebGL: true,
      }),
    ).toEqual({ modo: 'fallback_2d', motivo: 'movimento_reduzido' });

    expect(
      resolverModoRenderizacao({
        qualidadePreferida: 'auto',
        movimentoReduzido: false,
        suporteWebGL: false,
      }),
    ).toEqual({ modo: 'fallback_2d', motivo: 'sem_webgl' });

    expect(
      resolverModoRenderizacao({
        qualidadePreferida: 'auto',
        movimentoReduzido: false,
        suporteWebGL: true,
      }),
    ).toEqual({ modo: '3d', motivo: 'webgl_ativo' });

    const registrarMock = vi.fn().mockResolvedValue({ scope: '/' });
    const navComSw = {
      serviceWorker: {
        register: registrarMock,
      },
    } as unknown as Navigator;

    const reg = await registrarServiceWorker(navComSw);
    expect(reg).not.toBeNull();
    expect(registrarMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });

    expect(await registrarServiceWorker({} as Navigator)).toBeNull();

    const navComErro = {
      serviceWorker: {
        register: vi.fn().mockRejectedValue(new Error('Falha SW simulada')),
      },
    } as unknown as Navigator;
    expect(await registrarServiceWorker(navComErro)).toBeNull();
  });
});
