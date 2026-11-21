import { mapearRespostaSaudeApi } from './mapeador-saude';
import type { BuscadorDeSaude, EstadoSaudeApi } from './tipos-saude';

export type FuncaoFetch = typeof fetch;

export function criarClienteSaude(funcaoFetch: FuncaoFetch = fetch): BuscadorDeSaude {
  return {
    async consultarSaude(): Promise<EstadoSaudeApi> {
      const resposta = await funcaoFetch('/api/saude', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!resposta.ok) {
        throw new Error(`A API respondeu com codigo HTTP ${resposta.status}.`);
      }

      const dados: unknown = await resposta.json();
      return mapearRespostaSaudeApi(dados);
    },
  };
}
