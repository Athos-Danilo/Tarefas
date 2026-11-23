import { requisitarJson } from './cliente-http';
import type {
  EntradaIniciarSessaoFoco,
  HistoricoFoco,
  ServicoFocoFrontend,
  SessaoFoco,
  StatusSessaoFoco,
} from './tipos-foco';

interface SessaoFocoApi {
  id: string;
  tarefa_id: string;
  tarefa_titulo: string;
  duracao_planejada_seg: number;
  duracao_real_seg: number | null;
  iniciada_em: string;
  encerrada_em: string | null;
  status: StatusSessaoFoco;
}

interface RespostaSessaoAtivaApi {
  sessao_ativa: SessaoFocoApi | null;
}

interface RespostaSessaoItemApi {
  sessao: SessaoFocoApi;
}

interface RespostaHistoricoFocoApi {
  itens: SessaoFocoApi[];
  total_segundos_concluidos: number;
}

function mapearSessaoFoco(bruta: SessaoFocoApi): SessaoFoco {
  return {
    id: bruta.id,
    tarefaId: bruta.tarefa_id,
    tarefaTitulo: bruta.tarefa_titulo,
    duracaoPlanejadaSeg: bruta.duracao_planejada_seg,
    duracaoRealSeg: bruta.duracao_real_seg,
    iniciadaEm: bruta.iniciada_em,
    encerradaEm: bruta.encerrada_em,
    status: bruta.status,
  };
}

export function criarServicoFoco(funcaoFetch: typeof fetch = fetch): ServicoFocoFrontend {
  return {
    async obterSessaoAtiva(): Promise<SessaoFoco | null> {
      const dados = await requisitarJson<RespostaSessaoAtivaApi>(
        '/api/foco/sessoes/ativa',
        { method: 'GET' },
        funcaoFetch,
      );
      return dados.sessao_ativa ? mapearSessaoFoco(dados.sessao_ativa) : null;
    },

    async iniciarSessao(entrada: EntradaIniciarSessaoFoco): Promise<SessaoFoco> {
      const dados = await requisitarJson<RespostaSessaoItemApi>(
        '/api/foco/sessoes',
        {
          method: 'POST',
          body: JSON.stringify({
            tarefa_id: entrada.tarefaId,
            duracao_planejada_seg: entrada.duracaoPlanejadaSeg,
          }),
        },
        funcaoFetch,
      );
      return mapearSessaoFoco(dados.sessao);
    },

    async concluirSessao(sessaoId: string, duracaoRealSeg?: number): Promise<SessaoFoco> {
      const corpo = duracaoRealSeg !== undefined ? { duracao_real_seg: duracaoRealSeg } : {};
      const dados = await requisitarJson<RespostaSessaoItemApi>(
        `/api/foco/sessoes/${encodeURIComponent(sessaoId)}/concluir`,
        {
          method: 'POST',
          body: JSON.stringify(corpo),
        },
        funcaoFetch,
      );
      return mapearSessaoFoco(dados.sessao);
    },

    async interromperSessao(sessaoId: string, duracaoRealSeg?: number): Promise<SessaoFoco> {
      const corpo = duracaoRealSeg !== undefined ? { duracao_real_seg: duracaoRealSeg } : {};
      const dados = await requisitarJson<RespostaSessaoItemApi>(
        `/api/foco/sessoes/${encodeURIComponent(sessaoId)}/interromper`,
        {
          method: 'POST',
          body: JSON.stringify(corpo),
        },
        funcaoFetch,
      );
      return mapearSessaoFoco(dados.sessao);
    },

    async listarHistorico(limite = 20): Promise<HistoricoFoco> {
      const dados = await requisitarJson<RespostaHistoricoFocoApi>(
        `/api/foco/sessoes?limite=${encodeURIComponent(String(limite))}`,
        { method: 'GET' },
        funcaoFetch,
      );
      return {
        itens: dados.itens.map(mapearSessaoFoco),
        totalSegundosConcluidos: dados.total_segundos_concluidos,
      };
    },
  };
}
