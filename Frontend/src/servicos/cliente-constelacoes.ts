import { requisitarJson } from './cliente-http';
import type {
  EntradaSalvarLayoutConstelacao,
  LayoutConstelacao,
  PosicaoNoMapa,
  ServicoConstelacoesFrontend,
} from './tipos-constelacoes';

interface PosicaoNoLayoutApi {
  x: number;
  y: number;
  fixado: boolean;
}

interface RespostaLayoutConstelacaoApi {
  tarefa_raiz_id: string;
  nos: Record<string, PosicaoNoLayoutApi>;
  viewport: {
    zoom: number;
    centro_x: number;
    centro_y: number;
  };
  atualizado_em: string | null;
}

function mapearLayout(bruto: RespostaLayoutConstelacaoApi): LayoutConstelacao {
  const nos: Record<string, PosicaoNoMapa> = {};
  for (const [chave, pos] of Object.entries(bruto.nos)) {
    nos[chave] = {
      x: pos.x,
      y: pos.y,
      fixado: Boolean(pos.fixado),
    };
  }
  return {
    tarefaRaizId: bruto.tarefa_raiz_id,
    nos,
    viewport: {
      zoom: bruto.viewport.zoom,
      centroX: bruto.viewport.centro_x,
      centroY: bruto.viewport.centro_y,
    },
    atualizadoEm: bruto.atualizado_em,
  };
}

export function criarServicoConstelacoes(
  funcaoFetch: typeof fetch = fetch,
): ServicoConstelacoesFrontend {
  return {
    async obterLayout(tarefaRaizId: string): Promise<LayoutConstelacao> {
      const dados = await requisitarJson<RespostaLayoutConstelacaoApi>(
        `/api/constelacoes/${encodeURIComponent(tarefaRaizId)}/layout`,
        { method: 'GET' },
        funcaoFetch,
      );
      return mapearLayout(dados);
    },

    async salvarLayout(
      tarefaRaizId: string,
      entrada: EntradaSalvarLayoutConstelacao,
    ): Promise<LayoutConstelacao> {
      const dados = await requisitarJson<RespostaLayoutConstelacaoApi>(
        `/api/constelacoes/${encodeURIComponent(tarefaRaizId)}/layout`,
        {
          method: 'PUT',
          body: JSON.stringify({
            nos: entrada.nos,
            viewport: {
              zoom: entrada.viewport.zoom,
              centro_x: entrada.viewport.centroX,
              centro_y: entrada.viewport.centroY,
            },
          }),
        },
        funcaoFetch,
      );
      return mapearLayout(dados);
    },

    async limparLayout(tarefaRaizId: string): Promise<void> {
      await requisitarJson<void>(
        `/api/constelacoes/${encodeURIComponent(tarefaRaizId)}/layout`,
        { method: 'DELETE' },
        funcaoFetch,
      );
    },
  };
}
