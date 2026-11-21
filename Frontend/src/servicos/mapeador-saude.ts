import type { EstadoDependencia, EstadoGeralSaude, EstadoSaudeApi } from './tipos-saude';

const ESTADOS_DEPENDENCIA_VALIDOS = new Set<EstadoDependencia>([
  'conectado',
  'nao_configurado',
  'indisponivel',
]);

const ESTADOS_SAUDE_VALIDOS = new Set<EstadoGeralSaude>(['ok', 'degradado']);

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function exigirTexto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    throw new Error(`Resposta fora do contrato de saude: campo '${campo}' invalido.`);
  }
  return valor;
}

function exigirEstadoDependencia(valor: unknown, campo: string): EstadoDependencia {
  if (typeof valor === 'string' && ESTADOS_DEPENDENCIA_VALIDOS.has(valor as EstadoDependencia)) {
    return valor as EstadoDependencia;
  }
  throw new Error(`Resposta fora do contrato de saude: campo '${campo}' invalido.`);
}

export function mapearRespostaSaudeApi(entrada: unknown): EstadoSaudeApi {
  if (!ehObjeto(entrada)) {
    throw new Error('Resposta fora do contrato de saude: objeto JSON esperado.');
  }

  const statusBruto = entrada.status;
  if (
    typeof statusBruto !== 'string' ||
    !ESTADOS_SAUDE_VALIDOS.has(statusBruto as EstadoGeralSaude)
  ) {
    throw new Error("Resposta fora do contrato de saude: campo 'status' invalido.");
  }

  return {
    status: statusBruto as EstadoGeralSaude,
    servico: exigirTexto(entrada.servico, 'servico'),
    versao: exigirTexto(entrada.versao, 'versao'),
    bancoRelacional: exigirEstadoDependencia(entrada.banco_relacional, 'banco_relacional'),
    bancoDocumental: exigirEstadoDependencia(entrada.banco_documental, 'banco_documental'),
    timestamp: exigirTexto(entrada.timestamp, 'timestamp'),
  };
}
