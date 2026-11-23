import { describe, expect, it } from 'vitest';
import {
  PASSOS_TUTORIAL_LUME,
  avancarPassoTutorial,
  calcularGeometriaSpotlight,
  deveIniciarTutorialAutomaticamente,
  pularTutorial,
  resolverPassoInicial,
  voltarPassoTutorial,
} from '../../src/dominios/tutorial/passos-tutorial';

describe('Domínio puro do Modo Tutorial Guiado em 6 passos', () => {
  it('define exatamente 6 passos cobrindo todo o ecossistema do Lume', () => {
    expect(PASSOS_TUTORIAL_LUME).toHaveLength(6);
    expect(PASSOS_TUTORIAL_LUME.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(PASSOS_TUTORIAL_LUME[0]?.titulo.toLowerCase()).toContain('horizonte');
    expect(PASSOS_TUTORIAL_LUME[1]?.titulo.toLowerCase()).toContain('jornada');
    expect(PASSOS_TUTORIAL_LUME[2]?.titulo.toLowerCase()).toContain('conjunto');
    expect(PASSOS_TUTORIAL_LUME[3]?.titulo.toLowerCase()).toContain('notas');
    expect(PASSOS_TUTORIAL_LUME[4]?.titulo.toLowerCase()).toContain('visões');
  });

  it('decide abertura automática apenas em /jornada para contas pendentes ou revisão explícita', () => {
    expect(deveIniciarTutorialAutomaticamente('pendente', '/jornada', false)).toBe(true);
    expect(deveIniciarTutorialAutomaticamente('pendente', '/perfil', false)).toBe(false);
    expect(deveIniciarTutorialAutomaticamente('pendente', '/foco', false)).toBe(false);
    expect(deveIniciarTutorialAutomaticamente('pendente', '/estatisticas', false)).toBe(false);

    expect(deveIniciarTutorialAutomaticamente('pulado', '/jornada', false)).toBe(false);
    expect(deveIniciarTutorialAutomaticamente('concluido', '/jornada', false)).toBe(false);

    expect(deveIniciarTutorialAutomaticamente('concluido', '/jornada', true)).toBe(true);
    expect(deveIniciarTutorialAutomaticamente('pulado', '/jornada', true)).toBe(true);
    expect(deveIniciarTutorialAutomaticamente('concluido', '/perfil', true)).toBe(false);
  });

  it('resolve passo inicial e transições de avançar, voltar, concluir e pular sem rebaixar status', () => {
    expect(resolverPassoInicial(0, false)).toBe(1);
    expect(resolverPassoInicial(4, false)).toBe(4);
    expect(resolverPassoInicial(9, false)).toBe(6);
    expect(resolverPassoInicial(4, true)).toBe(1);

    const avanco1 = avancarPassoTutorial({
      passoAtual: 1,
      statusPersistido: 'pendente',
      modoRevisao: false,
    });
    expect(avanco1).toEqual({
      aberto: true,
      proximoPasso: 2,
      atualizacaoPersistida: { status: 'pendente', etapaAtual: 2 },
    });

    const volta2 = voltarPassoTutorial(2);
    expect(volta2).toBe(1);
    expect(voltarPassoTutorial(1)).toBe(1);

    const conclusao = avancarPassoTutorial({
      passoAtual: 6,
      statusPersistido: 'pendente',
      modoRevisao: false,
    });
    expect(conclusao).toEqual({
      aberto: false,
      proximoPasso: 6,
      atualizacaoPersistida: { status: 'concluido', etapaAtual: 6 },
    });

    const puloPrimeiraVez = pularTutorial({
      passoAtual: 3,
      statusPersistido: 'pendente',
      modoRevisao: false,
    });
    expect(puloPrimeiraVez).toEqual({
      aberto: false,
      atualizacaoPersistida: { status: 'pulado', etapaAtual: 3 },
    });

    // Em revisao de usuario que ja concluiu, avancar/pular nao rebaixa status para pendente/pulado
    const avancoRevisao = avancarPassoTutorial({
      passoAtual: 2,
      statusPersistido: 'concluido',
      modoRevisao: true,
    });
    expect(avancoRevisao).toEqual({
      aberto: true,
      proximoPasso: 3,
      atualizacaoPersistida: null,
    });

    const puloRevisaoConcluida = pularTutorial({
      passoAtual: 2,
      statusPersistido: 'concluido',
      modoRevisao: true,
    });
    expect(puloRevisaoConcluida).toEqual({
      aberto: false,
      atualizacaoPersistida: null,
    });

    const puloRevisaoDePulado = pularTutorial({
      passoAtual: 2,
      statusPersistido: 'pulado',
      modoRevisao: true,
    });
    expect(puloRevisaoDePulado).toEqual({
      aberto: false,
      atualizacaoPersistida: null,
    });
  });

  it('calcula geometria responsiva de spotlight para desktop, tablet, celular e fallback centralizado', () => {
    const semAlvo = calcularGeometriaSpotlight(null, { largura: 1280, altura: 800 });
    expect(semAlvo.centralizado).toBe(true);
    expect(semAlvo.recorte).toBeNull();

    const desktop = calcularGeometriaSpotlight(
      { top: 120, left: 320, width: 520, height: 140 },
      { largura: 1280, altura: 800 },
    );
    expect(desktop.centralizado).toBe(false);
    expect(desktop.recorte).not.toBeNull();
    expect(desktop.cartaoLeft).toBeGreaterThanOrEqual(12);
    expect(desktop.cartaoTop).toBeGreaterThanOrEqual(12);
    expect(desktop.cartaoLeft + desktop.cartaoLargura).toBeLessThanOrEqual(1280 - 12);

    const tablet = calcularGeometriaSpotlight(
      { top: 500, left: 80, width: 600, height: 180 },
      { largura: 768, altura: 1024 },
    );
    expect(tablet.cartaoLeft).toBeGreaterThanOrEqual(12);
    expect(tablet.cartaoTop + tablet.cartaoAlturaEstimada).toBeLessThanOrEqual(1024 - 12);

    const celular = calcularGeometriaSpotlight(
      { top: 180, left: 16, width: 288, height: 160 },
      { largura: 320, altura: 568 },
    );
    expect(celular.cartaoLargura).toBeLessThanOrEqual(320 - 24);
    expect(celular.cartaoLeft).toBeGreaterThanOrEqual(12);
    expect(celular.cartaoTop).toBeGreaterThanOrEqual(12);
    expect(celular.cartaoTop + celular.cartaoAlturaEstimada).toBeLessThanOrEqual(568 - 12);
  });
});
