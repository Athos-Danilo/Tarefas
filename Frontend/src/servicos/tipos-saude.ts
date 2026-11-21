export type EstadoDependencia = 'conectado' | 'nao_configurado' | 'indisponivel';

export type EstadoGeralSaude = 'ok' | 'degradado';

export interface RespostaSaudeApi {
  status: EstadoGeralSaude;
  servico: string;
  versao: string;
  banco_relacional: EstadoDependencia;
  banco_documental: EstadoDependencia;
  timestamp: string;
}

export interface EstadoSaudeApi {
  status: EstadoGeralSaude;
  servico: string;
  versao: string;
  bancoRelacional: EstadoDependencia;
  bancoDocumental: EstadoDependencia;
  timestamp: string;
}

export interface BuscadorDeSaude {
  consultarSaude(): Promise<EstadoSaudeApi>;
}
