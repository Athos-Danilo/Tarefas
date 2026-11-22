import { describe, expect, it } from 'vitest';
import {
  calcularPosicaoAstros,
  formatarMinutoParaHora,
  obterFaixaFavicon,
  obterMomentoDoDia,
} from '../../src/astronomia/ciclo-solar';
import { calcularFaseLunar, gerarCaminhoLuaSvg } from '../../src/astronomia/fase-lunar';

describe('Astronomia lunar real (Hemisferio Sul) e ciclo solar', () => {
  it('calcula fases lunares reais com orientacao para o Hemisferio Sul e Norte', () => {
    const luaNova = calcularFaseLunar(new Date('2024-04-08T18:21:00Z'));
    expect(luaNova.codigo).toBe('lua_nova');
    expect(luaNova.percentualIluminado).toBeLessThanOrEqual(2);

    const crescenteSul = calcularFaseLunar(new Date('2024-04-15T19:13:00Z'), 'sul');
    expect(crescenteSul.codigo).toBe('quarto_crescente');
    expect(crescenteSul.percentualIluminado).toBeGreaterThanOrEqual(44);
    expect(crescenteSul.percentualIluminado).toBeLessThanOrEqual(56);
    expect(crescenteSul.crescente).toBe(true);
    expect(crescenteSul.hemisferio).toBe('sul');
    expect(crescenteSul.ladoIluminado).toBe('esquerda');

    const luaCheia = calcularFaseLunar(new Date('2024-04-23T23:49:00Z'));
    expect(luaCheia.codigo).toBe('lua_cheia');
    expect(luaCheia.percentualIluminado).toBeGreaterThanOrEqual(98);

    const minguanteSul = calcularFaseLunar(new Date('2024-05-01T11:27:00Z'), 'sul');
    expect(minguanteSul.codigo).toBe('quarto_minguante');
    expect(minguanteSul.percentualIluminado).toBeGreaterThanOrEqual(44);
    expect(minguanteSul.percentualIluminado).toBeLessThanOrEqual(56);
    expect(minguanteSul.crescente).toBe(false);
    expect(minguanteSul.ladoIluminado).toBe('direita');

    const crescenteNorte = calcularFaseLunar(new Date('2024-04-15T19:13:00Z'), 'norte');
    const minguanteNorte = calcularFaseLunar(new Date('2024-05-01T11:27:00Z'), 'norte');
    expect(crescenteNorte.ladoIluminado).toBe('direita');
    expect(minguanteNorte.ladoIluminado).toBe('esquerda');
  });

  it('gera caminho SVG coerente para Lua Nova, Crescente, Cheia e Minguante', () => {
    expect(gerarCaminhoLuaSvg(0, 18, 'sul')).toBe('');

    const svgCrescenteSul = gerarCaminhoLuaSvg(0.25, 18, 'sul');
    expect(svgCrescenteSul).toContain('0 0 0');
    expect(svgCrescenteSul.endsWith('Z')).toBe(true);

    const svgMinguanteSul = gerarCaminhoLuaSvg(0.75, 18, 'sul');
    expect(svgMinguanteSul).toContain('0 0 1');
    expect(svgMinguanteSul.endsWith('Z')).toBe(true);

    const svgCheia = gerarCaminhoLuaSvg(0.5, 18, 'sul');
    expect(svgCheia).toContain('18 18');
    expect(svgCheia.endsWith('Z')).toBe(true);
  });

  it('calcula posicao dos astros, momentos do dia e fronteiras das faixas do favicon', () => {
    expect(formatarMinutoParaHora(510)).toBe('08:30');
    expect(formatarMinutoParaHora(0)).toBe('00:00');
    expect(formatarMinutoParaHora(1439)).toBe('23:59');

    const manha = calcularPosicaoAstros(510);
    expect(manha.solVisivel).toBe(true);
    expect(manha.luaVisivel).toBe(false);
    expect(manha.momentoDoDia).toBe('manha');
    expect(manha.faixaFavicon).toBe('manha');

    const tarde = calcularPosicaoAstros(900);
    expect(tarde.solVisivel).toBe(true);
    expect(tarde.momentoDoDia).toBe('tarde');
    expect(tarde.faixaFavicon).toBe('tarde');

    const crepusculo = calcularPosicaoAstros(1065);
    expect(crepusculo.momentoDoDia).toBe('crepusculo');
    expect(crepusculo.faixaFavicon).toBe('entardecer');

    const noite = calcularPosicaoAstros(1290);
    expect(noite.solVisivel).toBe(false);
    expect(noite.luaVisivel).toBe(true);
    expect(noite.momentoDoDia).toBe('noite');
    expect(noite.faixaFavicon).toBe('noite');

    const madrugada = calcularPosicaoAstros(120);
    expect(madrugada.solVisivel).toBe(false);
    expect(madrugada.luaVisivel).toBe(true);
    expect(madrugada.momentoDoDia).toBe('noite');
    expect(madrugada.faixaFavicon).toBe('noite');

    expect(obterFaixaFavicon(344)).toBe('noite');
    expect(obterFaixaFavicon(345)).toBe('manha');
    expect(obterFaixaFavicon(719)).toBe('manha');
    expect(obterFaixaFavicon(720)).toBe('tarde');
    expect(obterFaixaFavicon(1019)).toBe('tarde');
    expect(obterFaixaFavicon(1020)).toBe('entardecer');
    expect(obterFaixaFavicon(1139)).toBe('entardecer');
    expect(obterFaixaFavicon(1140)).toBe('noite');

    expect(obterMomentoDoDia(345)).toBe('manha');
    expect(obterMomentoDoDia(720)).toBe('tarde');
    expect(obterMomentoDoDia(1020)).toBe('crepusculo');
    expect(obterMomentoDoDia(1140)).toBe('noite');
  });
});
