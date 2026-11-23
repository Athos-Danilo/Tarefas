import { requisitarJson } from './cliente-http';
import type {
  ChavePublicaPushResposta,
  DispositivoPush,
  EntradaAtualizarLembrete,
  EntradaCriarLembrete,
  EntradaRegistrarDispositivoPush,
  LembreteDetalhado,
  ListaDispositivosPushResposta,
  ListaLembretesTarefaResposta,
  PlataformaPush,
  ServicoPushFrontend,
  StatusLembretePush,
} from './tipos-push';

interface ChavePublicaCrua {
  chave_publica: string | null;
  habilitado: boolean;
}

interface DispositivoCru {
  id: string;
  rotulo_dispositivo: string;
  plataforma: PlataformaPush;
  criado_em: string;
  ultimo_envio_em: string | null;
}

interface ListaDispositivosCrua {
  itens: DispositivoCru[];
  limite_maximo: number;
}

interface LembreteCru {
  id: string;
  tarefa_id: string;
  disparar_em: string;
  antecedencia_min: number;
  status: StatusLembretePush;
  enviado_em: string | null;
  criado_em: string;
}

interface ListaLembretesCrua {
  itens: LembreteCru[];
  limite_maximo: number;
}

function mapearDispositivo(cru: DispositivoCru): DispositivoPush {
  return {
    id: cru.id,
    rotuloDispositivo: cru.rotulo_dispositivo,
    plataforma: cru.plataforma,
    criadoEm: cru.criado_em,
    ultimoEnvioEm: cru.ultimo_envio_em,
  };
}

function mapearLembrete(cru: LembreteCru): LembreteDetalhado {
  return {
    id: cru.id,
    tarefaId: cru.tarefa_id,
    dispararEm: cru.disparar_em,
    antecedenciaMin: cru.antecedencia_min,
    status: cru.status,
    enviadoEm: cru.enviado_em,
    criadoEm: cru.criado_em,
  };
}

export function criarServicoPush(funcaoFetch: typeof fetch = fetch): ServicoPushFrontend {
  return {
    async obterChavePublica(): Promise<ChavePublicaPushResposta> {
      const cru = await requisitarJson<ChavePublicaCrua>(
        '/api/push/chave-publica',
        { method: 'GET' },
        funcaoFetch,
      );
      return {
        chavePublica: cru.chave_publica,
        habilitado: cru.habilitado,
      };
    },

    async listarDispositivos(): Promise<ListaDispositivosPushResposta> {
      const cru = await requisitarJson<ListaDispositivosCrua>(
        '/api/push/dispositivos',
        { method: 'GET' },
        funcaoFetch,
      );
      return {
        itens: cru.itens.map(mapearDispositivo),
        limiteMaximo: cru.limite_maximo,
      };
    },

    async registrarDispositivo(entrada: EntradaRegistrarDispositivoPush): Promise<DispositivoPush> {
      const cru = await requisitarJson<DispositivoCru>(
        '/api/push/dispositivos',
        {
          method: 'POST',
          body: JSON.stringify({
            endpoint: entrada.endpoint,
            chaves: entrada.chaves,
            rotulo_dispositivo: entrada.rotuloDispositivo ?? null,
            plataforma: entrada.plataforma,
          }),
        },
        funcaoFetch,
      );
      return mapearDispositivo(cru);
    },

    async revogarDispositivo(dispositivoId: string): Promise<void> {
      await requisitarJson<void>(
        `/api/push/dispositivos/${dispositivoId}`,
        { method: 'DELETE' },
        funcaoFetch,
      );
    },

    async listarLembretes(tarefaId: string): Promise<ListaLembretesTarefaResposta> {
      const cru = await requisitarJson<ListaLembretesCrua>(
        `/api/tarefas/${tarefaId}/lembretes`,
        { method: 'GET' },
        funcaoFetch,
      );
      return {
        itens: cru.itens.map(mapearLembrete),
        limiteMaximo: cru.limite_maximo,
      };
    },

    async criarLembrete(
      tarefaId: string,
      entrada: EntradaCriarLembrete,
    ): Promise<LembreteDetalhado> {
      const cru = await requisitarJson<LembreteCru>(
        `/api/tarefas/${tarefaId}/lembretes`,
        {
          method: 'POST',
          body: JSON.stringify({
            disparar_em: entrada.dispararEm,
            antecedencia_min: entrada.antecedenciaMin,
          }),
        },
        funcaoFetch,
      );
      return mapearLembrete(cru);
    },

    async atualizarLembrete(
      lembreteId: string,
      entrada: EntradaAtualizarLembrete,
    ): Promise<LembreteDetalhado> {
      const cru = await requisitarJson<LembreteCru>(
        `/api/lembretes/${lembreteId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            disparar_em: entrada.dispararEm,
            antecedencia_min: entrada.antecedenciaMin,
          }),
        },
        funcaoFetch,
      );
      return mapearLembrete(cru);
    },

    async cancelarLembrete(lembreteId: string): Promise<void> {
      await requisitarJson<void>(`/api/lembretes/${lembreteId}`, { method: 'DELETE' }, funcaoFetch);
    },
  };
}
