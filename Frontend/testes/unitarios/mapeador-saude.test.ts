import { describe, expect, it } from 'vitest';
import { mapearRespostaSaudeApi } from '../../src/servicos/mapeador-saude';

describe('mapearRespostaSaudeApi', () => {
  it('converte payload oficial snake_case da API para camelCase em portugues', () => {
    const resposta = mapearRespostaSaudeApi({
      status: 'ok',
      servico: 'lume-api',
      versao: '0.1.0',
      banco_relacional: 'nao_configurado',
      banco_documental: 'nao_configurado',
      timestamp: '2026-11-21T14:30:00Z',
    });

    expect(resposta).toEqual({
      status: 'ok',
      servico: 'lume-api',
      versao: '0.1.0',
      bancoRelacional: 'nao_configurado',
      bancoDocumental: 'nao_configurado',
      timestamp: '2026-11-21T14:30:00Z',
    });
  });

  it('aceita estado degradado com dependencia indisponivel', () => {
    const resposta = mapearRespostaSaudeApi({
      status: 'degradado',
      servico: 'lume-api',
      versao: '0.1.0',
      banco_relacional: 'indisponivel',
      banco_documental: 'conectado',
      timestamp: '2026-11-21T14:35:00Z',
    });

    expect(resposta.status).toBe('degradado');
    expect(resposta.bancoRelacional).toBe('indisponivel');
    expect(resposta.bancoDocumental).toBe('conectado');
  });

  it('rejeita payload invalido fora do contrato da API', () => {
    expect(() => mapearRespostaSaudeApi({ status: 'invalido' })).toThrow(/contrato de saude/i);
  });
});
