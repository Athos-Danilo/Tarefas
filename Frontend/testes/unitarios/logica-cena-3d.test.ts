import { describe, expect, it } from 'vitest';
import { calcularPosicaoAstros } from '../../src/astronomia/ciclo-solar';
import { calcularFaseLunar } from '../../src/astronomia/fase-lunar';
import { calcularEstadoCromatico } from '../../src/astronomia/sistema-cromatico';
import {
  CAMERA_REPOUSO_3D,
  calcularAlvoParalaxeCamera,
  calcularParametrosCena3D,
  calcularParametrosClima3D,
  calcularPerfilDesempenho3D,
  calcularVetorLuzFaseLunar,
  criarGeradorDeterministico,
} from '../../src/cenario/logica-cena-3d';

describe('Logica pura da cena 3D (D13, Lua real e clima)', () => {
  it('calcula perfil D13 para desktop (riqueza visual maxima) e mobile adaptado', () => {
    const desktop = calcularPerfilDesempenho3D(1280);
    expect(desktop.perfil).toBe('desktop_riqueza_maxima');
    expect(desktop.dpr).toEqual([1, 2]);
    expect(desktop.sombrasAtivas).toBe(true);
    expect(desktop.tetoTriangulos).toBe(70000);
    expect(desktop.triangulosEstimados).toBeGreaterThan(0);
    expect(desktop.triangulosEstimados).toBeLessThanOrEqual(70000);

    const mobile = calcularPerfilDesempenho3D(390);
    expect(mobile.perfil).toBe('mobile_adaptado');
    expect(mobile.dpr).toEqual([1, 1.25]);
    expect(mobile.sombrasAtivas).toBe(false);
    expect(mobile.tetoTriangulos).toBe(28000);
    expect(mobile.triangulosEstimados).toBeGreaterThan(0);
    expect(mobile.triangulosEstimados).toBeLessThanOrEqual(28000);

    expect(mobile.quantidadeArbustos).toBeLessThan(desktop.quantidadeArbustos);
    expect(mobile.quantidadeFlores).toBeLessThan(desktop.quantidadeFlores);
    expect(mobile.maxGotasChuva).toBeLessThan(desktop.maxGotasChuva);
    expect(mobile.maxNuvens).toBeLessThan(desktop.maxNuvens);
    expect(mobile.quantidadeEstrelas).toBeLessThan(desktop.quantidadeEstrelas);
  });

  it('orienta vetor de iluminacao lunar para o Hemisferio Sul e Norte', () => {
    const luaNova = calcularVetorLuzFaseLunar(
      calcularFaseLunar(new Date('2024-04-08T18:21:00Z'), 'sul'),
    );
    expect(luaNova[2]).toBeLessThan(-0.9);
    expect(Math.hypot(...luaNova)).toBeCloseTo(1, 4);

    const crescenteSul = calcularVetorLuzFaseLunar(
      calcularFaseLunar(new Date('2024-04-15T19:13:00Z'), 'sul'),
    );
    expect(crescenteSul[0]).toBeLessThan(-0.9);
    expect(Math.hypot(...crescenteSul)).toBeCloseTo(1, 4);

    const luaCheia = calcularVetorLuzFaseLunar(
      calcularFaseLunar(new Date('2024-04-23T23:49:00Z'), 'sul'),
    );
    expect(luaCheia[2]).toBeGreaterThan(0.9);
    expect(Math.hypot(...luaCheia)).toBeCloseTo(1, 4);

    const minguanteSul = calcularVetorLuzFaseLunar(
      calcularFaseLunar(new Date('2024-05-01T11:27:00Z'), 'sul'),
    );
    expect(minguanteSul[0]).toBeGreaterThan(0.9);
    expect(Math.hypot(...minguanteSul)).toBeCloseTo(1, 4);

    const crescenteNorte = calcularVetorLuzFaseLunar(
      calcularFaseLunar(new Date('2024-04-15T19:13:00Z'), 'norte'),
    );
    const minguanteNorte = calcularVetorLuzFaseLunar(
      calcularFaseLunar(new Date('2024-05-01T11:27:00Z'), 'norte'),
    );
    expect(crescenteNorte[0]).toBeGreaterThan(0.9);
    expect(minguanteNorte[0]).toBeLessThan(-0.9);
  });

  it('mapeia os 5 estados climaticos 3D e zera relampagos com movimento reduzido', () => {
    const perfil = calcularPerfilDesempenho3D(1280);

    const limpo = calcularParametrosClima3D('limpo', perfil, false);
    expect(limpo.quantidadeNuvens).toBe(0);
    expect(limpo.quantidadeGotas).toBe(0);
    expect(limpo.intensidadeRelampagoMax).toBe(0);

    const parcNublado = calcularParametrosClima3D('parcialmente_nublado', perfil, false);
    expect(parcNublado.quantidadeNuvens).toBeGreaterThan(0);
    expect(parcNublado.quantidadeGotas).toBe(0);

    const nublado = calcularParametrosClima3D('nublado', perfil, false);
    expect(nublado.quantidadeNuvens).toBeGreaterThan(parcNublado.quantidadeNuvens);
    expect(nublado.quantidadeGotas).toBe(0);

    const chuvoso = calcularParametrosClima3D('chuvoso', perfil, false);
    expect(chuvoso.quantidadeNuvens).toBe(perfil.maxNuvens);
    expect(chuvoso.quantidadeGotas).toBeGreaterThan(0);
    expect(chuvoso.intensidadeRelampagoMax).toBe(0);

    const tempestade = calcularParametrosClima3D('tempestade', perfil, false);
    expect(tempestade.quantidadeGotas).toBe(perfil.maxGotasChuva);
    expect(tempestade.intensidadeRelampagoMax).toBeGreaterThan(0);

    const tempestadeAcessivel = calcularParametrosClima3D('tempestade', perfil, true);
    expect(tempestadeAcessivel.quantidadeGotas).toBe(perfil.maxGotasChuva);
    expect(tempestadeAcessivel.intensidadeRelampagoMax).toBe(0);
  });

  it('calcula cena dia/noite, reacao ao progresso, paralaxe segura e PRNG deterministico', () => {
    const perfil = calcularPerfilDesempenho3D(1280);
    const faseLunar = calcularFaseLunar(new Date('2024-04-15T19:13:00Z'), 'sul');

    const diaInicial = calcularParametrosCena3D({
      cromatico: calcularEstadoCromatico(510),
      astros: calcularPosicaoAstros(510),
      faseLunar,
      estadoClimatico: 'limpo',
      progressoTarefas: 0,
      reduzirMovimento: false,
      perfil,
    });

    const diaConcluido = calcularParametrosCena3D({
      cromatico: calcularEstadoCromatico(510),
      astros: calcularPosicaoAstros(510),
      faseLunar,
      estadoClimatico: 'limpo',
      progressoTarefas: 1,
      reduzirMovimento: false,
      perfil,
    });

    expect(diaConcluido.escalaFlorescimento).toBeGreaterThan(diaInicial.escalaFlorescimento);
    expect(diaInicial.opacidadeVagalumes).toBe(0);
    expect(diaInicial.posicaoSol[1]).toBeGreaterThan(0);

    const noiteInicial = calcularParametrosCena3D({
      cromatico: calcularEstadoCromatico(1290),
      astros: calcularPosicaoAstros(1290),
      faseLunar,
      estadoClimatico: 'limpo',
      progressoTarefas: 0,
      reduzirMovimento: false,
      perfil,
    });

    const noiteConcluida = calcularParametrosCena3D({
      cromatico: calcularEstadoCromatico(1290),
      astros: calcularPosicaoAstros(1290),
      faseLunar,
      estadoClimatico: 'limpo',
      progressoTarefas: 1,
      reduzirMovimento: false,
      perfil,
    });

    expect(noiteConcluida.brilhoConstelacoes).toBeGreaterThan(noiteInicial.brilhoConstelacoes);
    expect(noiteConcluida.opacidadeVagalumes).toBeGreaterThan(0);
    expect(noiteConcluida.posicaoLua[1]).toBeGreaterThan(0);

    const alvo = calcularAlvoParalaxeCamera(4.5, -2.5, false);
    expect(alvo[0]).toBeLessThanOrEqual(0.8);
    expect(alvo[0]).toBeGreaterThan(0);
    expect(alvo[2]).toBe(CAMERA_REPOUSO_3D[2]);

    const alvoRepouso = calcularAlvoParalaxeCamera(0.8, -0.7, true);
    expect(alvoRepouso).toEqual([0, 3.1, 13.5]);

    const rngA = criarGeradorDeterministico(42);
    const rngB = criarGeradorDeterministico(42);
    const seqA = [rngA(), rngA(), rngA(), rngA()];
    const seqB = [rngB(), rngB(), rngB(), rngB()];
    expect(seqA).toEqual(seqB);
    for (const num of seqA) {
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThan(1);
    }
  });
});
