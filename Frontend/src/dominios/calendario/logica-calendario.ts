import {
  calcularFaseLunar,
  type DadosFaseLunar,
  type Hemisferio,
} from '../../astronomia/fase-lunar';

export const DIAS_SEMANA_CABECALHO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export interface CelulaDiaCalendario {
  dataIso: string;
  ano: number;
  mes: number;
  diaNumero: number;
  pertenceAoMes: boolean;
  faseLunar: DadosFaseLunar;
}

export function formatarDataIsoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function formatarTituloMesAno(ano: number, mes: number): string {
  const nome = NOMES_MESES[mes - 1] ?? `Mês ${mes}`;
  return `${nome} de ${ano}`;
}

export function resolverFusoHorarioCliente(): string {
  try {
    const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return fuso || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

export function avancarMes(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const indiceTotal = ano * 12 + (mes - 1) + delta;
  const novoAno = Math.floor(indiceTotal / 12);
  const novoMes = (((indiceTotal % 12) + 12) % 12) + 1;
  return { ano: novoAno, mes: novoMes };
}

export function gerarGradeMensal(
  ano: number,
  mes: number,
  hemisferio: Hemisferio = 'sul',
): CelulaDiaCalendario[] {
  const primeiroDia = new Date(ano, mes - 1, 1, 12, 0, 0);
  const deslocamentoInicio = primeiroDia.getDay();
  const totalDiasMes = new Date(ano, mes, 0, 12, 0, 0).getDate();
  const totalCelulas = Math.ceil((deslocamentoInicio + totalDiasMes) / 7) * 7;

  const celulas: CelulaDiaCalendario[] = [];
  for (let i = 0; i < totalCelulas; i += 1) {
    const dataCelula = new Date(ano, mes - 1, 1 - deslocamentoInicio + i, 12, 0, 0);
    const cAno = dataCelula.getFullYear();
    const cMes = dataCelula.getMonth() + 1;
    const cDia = dataCelula.getDate();
    celulas.push({
      dataIso: formatarDataIsoLocal(dataCelula),
      ano: cAno,
      mes: cMes,
      diaNumero: cDia,
      pertenceAoMes: cAno === ano && cMes === mes,
      faseLunar: calcularFaseLunar(dataCelula, hemisferio),
    });
  }
  return celulas;
}

export function navegarDiaPorTeclado(dataIsoAtual: string, tecla: string): string {
  const [anoStr, mesStr, diaStr] = dataIsoAtual.split('-');
  const ano = Number.parseInt(anoStr ?? '', 10);
  const mes = Number.parseInt(mesStr ?? '', 10);
  const dia = Number.parseInt(diaStr ?? '', 10);
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || !Number.isFinite(dia)) {
    return dataIsoAtual;
  }

  switch (tecla) {
    case 'ArrowRight':
      return formatarDataIsoLocal(new Date(ano, mes - 1, dia + 1, 12, 0, 0));
    case 'ArrowLeft':
      return formatarDataIsoLocal(new Date(ano, mes - 1, dia - 1, 12, 0, 0));
    case 'ArrowDown':
      return formatarDataIsoLocal(new Date(ano, mes - 1, dia + 7, 12, 0, 0));
    case 'ArrowUp':
      return formatarDataIsoLocal(new Date(ano, mes - 1, dia - 7, 12, 0, 0));
    case 'Home':
      return formatarDataIsoLocal(new Date(ano, mes - 1, 1, 12, 0, 0));
    case 'End':
      return formatarDataIsoLocal(new Date(ano, mes, 0, 12, 0, 0));
    default:
      return dataIsoAtual;
  }
}

export function extrairAnoMesDeIso(dataIso: string): { ano: number; mes: number } | null {
  const [anoStr, mesStr] = dataIso.split('-');
  const ano = Number.parseInt(anoStr ?? '', 10);
  const mes = Number.parseInt(mesStr ?? '', 10);
  if (!Number.isFinite(ano) || !Number.isFinite(mes)) {
    return null;
  }
  return { ano, mes };
}
