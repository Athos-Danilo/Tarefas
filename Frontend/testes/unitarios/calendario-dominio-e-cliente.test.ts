import { describe, expect, it, vi } from 'vitest';
import {
  avancarMes,
  gerarGradeMensal,
  navegarDiaPorTeclado,
} from '../../src/dominios/calendario/logica-calendario';
import { criarServicoCalendario } from '../../src/servicos/cliente-calendario';

describe('Domínio do Calendário Mensal dos Prazos', () => {
  it('gera grade mensal alinhada Domingo..Sábado com fase lunar real no Hemisfério Sul', () => {
    const gradeDez = gerarGradeMensal(2026, 12, 'sul');
    expect(gradeDez.length % 7).toBe(0);
    // 2026-12-01 cai na terça, então domingo e segunda anteriores vêm de novembro
    expect(gradeDez[0]?.dataIso).toBe('2026-11-29');
    expect(gradeDez[0]?.pertenceAoMes).toBe(false);
    expect(gradeDez[2]?.dataIso).toBe('2026-12-01');
    expect(gradeDez[2]?.pertenceAoMes).toBe(true);

    const diasDoMes = gradeDez.filter((c) => c.pertenceAoMes);
    expect(diasDoMes).toHaveLength(31);
    for (const celula of diasDoMes) {
      expect(celula.faseLunar.hemisferio).toBe('sul');
      expect(celula.faseLunar.nome.length).toBeGreaterThan(0);
      expect(celula.faseLunar.percentualIluminado).toBeGreaterThanOrEqual(0);
      expect(celula.faseLunar.percentualIluminado).toBeLessThanOrEqual(100);
    }
  });

  it('avança e retrocede meses atravessando virada de ano', () => {
    expect(avancarMes(2026, 12, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(avancarMes(2026, 1, -1)).toEqual({ ano: 2025, mes: 12 });
  });

  it('navega dias por teclado inclusive cruzando virada de mês', () => {
    expect(navegarDiaPorTeclado('2026-11-30', 'ArrowRight')).toBe('2026-12-01');
    expect(navegarDiaPorTeclado('2026-12-01', 'ArrowLeft')).toBe('2026-11-30');
    expect(navegarDiaPorTeclado('2026-11-15', 'ArrowDown')).toBe('2026-11-22');
    expect(navegarDiaPorTeclado('2026-11-15', 'ArrowUp')).toBe('2026-11-08');
    expect(navegarDiaPorTeclado('2026-11-15', 'Home')).toBe('2026-11-01');
    expect(navegarDiaPorTeclado('2026-11-15', 'End')).toBe('2026-11-30');
  });
});

describe('Cliente HTTP do Calendário Mensal', () => {
  it('envia consulta GET com ano/mês/fuso/filtros e mapeia resposta para camelCase', async () => {
    const chamadaFetch = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ano: 2026,
          mes: 11,
          fuso_horario: 'America/Sao_Paulo',
          dias: [
            {
              data: '2026-11-30',
              total_tarefas: 1,
              maior_prioridade: 'urgente',
              tem_atrasada: true,
              tem_recorrente: true,
              tarefas: [
                {
                  id: 'tar-1',
                  titulo: 'Entrega Web II',
                  prioridade: 'urgente',
                  status: 'em_andamento',
                  turno: 'noite',
                  prazo: '2026-11-30T23:59:00Z',
                  atrasada: true,
                  recorrente: true,
                  eh_projecao: false,
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const cliente = criarServicoCalendario(chamadaFetch);
    const resultado = await cliente.consultarMensal({
      ano: 2026,
      mes: 11,
      fusoHorario: 'America/Sao_Paulo',
      prioridade: 'urgente',
      turno: 'noite',
    });

    const url = chamadaFetch.mock.calls[0]?.[0];
    if (typeof url !== 'string') {
      throw new Error('URL string esperada na chamada fetch.');
    }
    expect(url).toContain('/api/calendario/mensal?');
    expect(url).toContain('ano=2026');
    expect(url).toContain('mes=11');
    expect(url).toContain('fuso_horario=America%2FSao_Paulo');
    expect(url).toContain('prioridade=urgente');
    expect(url).toContain('turno=noite');

    expect(resultado.fusoHorario).toBe('America/Sao_Paulo');
    expect(resultado.dias[0]).toMatchObject({
      data: '2026-11-30',
      totalTarefas: 1,
      maiorPrioridade: 'urgente',
      temAtrasada: true,
      temRecorrente: true,
    });
    expect(resultado.dias[0]?.tarefas[0]?.ehProjecao).toBe(false);
  });
});
