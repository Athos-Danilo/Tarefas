import { ErroApi, requisitarJson } from './cliente-http';
import type {
  BlocoNota,
  ClimaAtual,
  ConfiguracaoRecorrencia,
  DetalheTarefaCompleta,
  DetalhesTarefa,
  EntradaAtualizarTarefa,
  EntradaConsentimentoClima,
  EntradaCriarTarefa,
  EstadoClimaUsuario,
  EstrategiaExclusao,
  EtiquetaCompleta,
  EtiquetaResumo,
  FiltrosListagemTarefas,
  ItemOrdenacaoIrma,
  LembreteTarefaResumo,
  ListaEtiquetasResposta,
  ListaTarefasResposta,
  MetadadosVisuaisTarefa,
  ResponsavelTarefaResumo,
  ResultadoConcluirTarefa,
  ResultadoConsentimentoClima,
  ResultadoCriarTarefa,
  ResultadoDesfazerCascata,
  ResultadoExcluirTarefa,
  ResultadoMoverTarefa,
  ResultadoReabrirTarefa,
  ServicoJornadaFrontend,
  SugestaoCidadeClima,
  TarefaArvore,
} from './tipos-jornada';

interface EtiquetaApiCrua {
  id: string;
  nome: string;
  cor: string;
  criado_em?: string | null;
}

interface RecorrenciaApiCrua {
  tipo: ConfiguracaoRecorrencia['tipo'];
  dias_semana?: number[];
  dia_mes?: number | null;
  intervalo?: number;
}

interface ResponsavelApiCrua {
  tipo: 'usuario' | 'vaga';
  usuario_id?: string | null;
  vaga_id?: string | null;
  nome_exibicao: string;
  avatar_url?: string | null;
}

interface TarefaApiCrua {
  id: string;
  tarefa_pai_id: string | null;
  titulo: string;
  prioridade: TarefaArvore['prioridade'];
  status: TarefaArvore['status'];
  turno: TarefaArvore['turno'];
  prazo: string | null;
  profundidade: number;
  ordem_manual: number;
  percentual_conclusao: number;
  total_folhas: number;
  folhas_concluidas: number;
  tem_filha_urgente_aberta: boolean;
  etiquetas: EtiquetaApiCrua[];
  recorrencia: RecorrenciaApiCrua;
  serie_recorrencia_id: string | null;
  vezes_reaberta: number;
  compartilhada: boolean;
  responsavel?: ResponsavelApiCrua | null;
  lembretes_pendentes: number;
  criado_em: string;
  atualizado_em: string;
  subtarefas?: TarefaApiCrua[];
}

interface ListarTarefasApiCrua {
  itens: TarefaApiCrua[];
  totais: {
    ativas: number;
    concluidas: number;
    limite_ativas: number;
  };
}

interface CriarTarefaApiCrua {
  tarefa: TarefaApiCrua;
  ancestrais_atualizados: Array<{
    id: string;
    status: TarefaArvore['status'];
    percentual_conclusao: number;
    total_folhas: number;
    folhas_concluidas: number;
    tem_filha_urgente_aberta: boolean;
  }>;
}

interface DetalhesApiCrua {
  tarefa_id: string;
  usuario_id: string;
  metadados_visuais: Record<string, unknown>;
  notas_em_blocos: BlocoNota[];
  atualizado_em: string | null;
}

interface ObterTarefaApiCrua {
  tarefa: TarefaApiCrua;
  detalhes: DetalhesApiCrua;
  lembretes: Array<{
    id: string;
    disparar_em: string;
    antecedencia_min: number;
    status: string;
  }>;
}

interface ConcluirTarefaApiCrua {
  tarefa_id: string;
  nos_concluidos: string[];
  ancestrais_atualizados: string[];
  token_desfazer: string | null;
  expira_em: string | null;
  proxima_ocorrencia?: {
    id: string;
    prazo: string | null;
    serie_recorrencia_id: string | null;
  } | null;
}

interface DesfazerCascataApiCrua {
  restaurados: number;
  tarefa_id: string;
}

interface ReabrirTarefaApiCrua {
  tarefa_id: string;
  status: TarefaArvore['status'];
  nos_reabertos: string[];
  ancestrais_reabertos: string[];
}

interface MoverTarefaApiCrua {
  tarefa: TarefaApiCrua;
  ancestrais_concluidos: string[];
  ancestrais_reabertos: string[];
}

interface ExcluirTarefaApiCrua {
  estrategia_aplicada: EstrategiaExclusao;
  tarefas_removidas: number;
  filhas_promovidas: number;
}

interface ListaEtiquetasApiCrua {
  itens: EtiquetaApiCrua[];
  limite_maximo: number;
}

interface BuscaCidadesApiCrua {
  itens: Array<{
    cidade: string;
    uf: string | null;
    pais: string | null;
    latitude_aprox: number;
    longitude_aprox: number;
  }>;
}

interface ConsentimentoClimaApiCrua {
  habilitado: boolean;
  modo_localizacao: ResultadoConsentimentoClima['modoLocalizacao'];
  cidade: string | null;
  uf: string | null;
  latitude_aprox: number | null;
  longitude_aprox: number | null;
  estado_climatico: ResultadoConsentimentoClima['estadoClimatico'];
}

interface ClimaAtualApiCrua {
  habilitado: boolean;
  cidade: string | null;
  uf: string | null;
  temperatura_c: number;
  codigo_wmo: number;
  estado_climatico: ClimaAtual['estadoClimatico'];
  descricao: string;
  origem_cache: boolean;
  atualizado_em: string;
}

function mapearEtiquetaResumo(cru: EtiquetaApiCrua): EtiquetaResumo {
  return {
    id: cru.id,
    nome: cru.nome,
    cor: cru.cor,
  };
}

function mapearEtiquetaCompleta(cru: EtiquetaApiCrua): EtiquetaCompleta {
  return {
    id: cru.id,
    nome: cru.nome,
    cor: cru.cor,
    criadoEm: cru.criado_em ?? null,
  };
}

function mapearRecorrencia(cru: RecorrenciaApiCrua): ConfiguracaoRecorrencia {
  return {
    tipo: cru.tipo,
    diasSemana: Array.isArray(cru.dias_semana) ? cru.dias_semana : [],
    diaMes: cru.dia_mes ?? null,
    intervalo: cru.intervalo ?? 1,
  };
}

function serializarRecorrencia(rec: ConfiguracaoRecorrencia) {
  return {
    tipo: rec.tipo,
    dias_semana: rec.diasSemana,
    dia_mes: rec.diaMes,
    intervalo: rec.intervalo,
  };
}

function mapearResponsavel(
  cru: ResponsavelApiCrua | null | undefined,
): ResponsavelTarefaResumo | null {
  if (!cru) {
    return null;
  }
  return {
    tipo: cru.tipo,
    usuarioId: cru.usuario_id ?? null,
    vagaId: cru.vaga_id ?? null,
    nomeExibicao: cru.nome_exibicao,
    avatarUrl: cru.avatar_url ?? null,
  };
}

function mapearTarefa(cru: TarefaApiCrua): TarefaArvore {
  return {
    id: cru.id,
    tarefaPaiId: cru.tarefa_pai_id,
    titulo: cru.titulo,
    prioridade: cru.prioridade,
    status: cru.status,
    turno: cru.turno,
    prazo: cru.prazo,
    profundidade: cru.profundidade,
    ordemManual: cru.ordem_manual,
    percentualConclusao: cru.percentual_conclusao,
    totalFolhas: cru.total_folhas,
    folhasConcluidas: cru.folhas_concluidas,
    temFilhaUrgenteAberta: cru.tem_filha_urgente_aberta,
    etiquetas: (cru.etiquetas ?? []).map(mapearEtiquetaResumo),
    recorrencia: mapearRecorrencia(cru.recorrencia),
    serieRecorrenciaId: cru.serie_recorrencia_id,
    vezesReaberta: cru.vezes_reaberta,
    compartilhada: cru.compartilhada,
    responsavel: mapearResponsavel(cru.responsavel),
    lembretesPendentes: cru.lembretes_pendentes,
    criadoEm: cru.criado_em,
    atualizadoEm: cru.atualizado_em,
    subtarefas: (cru.subtarefas ?? []).map(mapearTarefa),
  };
}

function mapearDetalhes(cru: DetalhesApiCrua): DetalhesTarefa {
  const mv = cru.metadados_visuais ?? {};
  const metadadosVisuais: MetadadosVisuaisTarefa = {};
  if (typeof mv.forma_botanica === 'string') {
    metadadosVisuais.formaBotanica = mv.forma_botanica;
  }
  if (typeof mv.cor_estrela === 'string') {
    metadadosVisuais.corEstrela = mv.cor_estrela;
  }
  if (typeof mv.icone === 'string') {
    metadadosVisuais.icone = mv.icone;
  }

  return {
    tarefaId: cru.tarefa_id,
    usuarioId: cru.usuario_id,
    metadadosVisuais,
    notasEmBlocos: Array.isArray(cru.notas_em_blocos) ? cru.notas_em_blocos : [],
    atualizadoEm: cru.atualizado_em,
  };
}

function serializarMetadadosVisuais(mv: MetadadosVisuaisTarefa): Record<string, string> {
  const saida: Record<string, string> = {};
  if (mv.formaBotanica) {
    saida.forma_botanica = mv.formaBotanica;
  }
  if (mv.corEstrela) {
    saida.cor_estrela = mv.corEstrela;
  }
  if (mv.icone) {
    saida.icone = mv.icone;
  }
  return saida;
}

export function construirUrlExportacaoTarefas(formato: 'md' | 'json', tarefaId?: string): string {
  const params = new URLSearchParams({ formato });
  if (tarefaId) {
    params.set('tarefa_id', tarefaId);
  }
  return `/api/exportacao/tarefas?${params.toString()}`;
}

export function criarServicoJornada(funcaoFetch: typeof fetch = fetch): ServicoJornadaFrontend {
  return {
    async listarTarefas(filtros: FiltrosListagemTarefas = {}): Promise<ListaTarefasResposta> {
      const params = new URLSearchParams();
      if (filtros.turno) {
        params.set('turno', filtros.turno);
      }
      if (filtros.status) {
        params.set('status', filtros.status);
      }
      if (filtros.prioridade) {
        params.set('prioridade', filtros.prioridade);
      }
      if (filtros.etiquetaId) {
        params.set('etiqueta_id', filtros.etiquetaId);
      }
      if (filtros.busca && filtros.busca.trim()) {
        params.set('busca', filtros.busca.trim());
      }
      if (filtros.incluirConcluidas !== undefined) {
        params.set('incluir_concluidas', String(filtros.incluirConcluidas));
      }
      if (filtros.formato) {
        params.set('formato', filtros.formato);
      }

      const qs = params.toString();
      const url = qs ? `/api/tarefas?${qs}` : '/api/tarefas';
      const resp = await requisitarJson<ListarTarefasApiCrua>(url, { method: 'GET' }, funcaoFetch);
      return {
        itens: resp.itens.map(mapearTarefa),
        totais: {
          ativas: resp.totais.ativas,
          concluidas: resp.totais.concluidas,
          limiteAtivas: resp.totais.limite_ativas,
        },
      };
    },

    async obterTarefa(tarefaId: string): Promise<DetalheTarefaCompleta> {
      const resp = await requisitarJson<ObterTarefaApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}`,
        { method: 'GET' },
        funcaoFetch,
      );
      const lembretes: LembreteTarefaResumo[] = (resp.lembretes ?? []).map((lem) => ({
        id: lem.id,
        dispararEm: lem.disparar_em,
        antecedenciaMin: lem.antecedencia_min,
        status: lem.status,
      }));
      return {
        tarefa: mapearTarefa(resp.tarefa),
        detalhes: mapearDetalhes(resp.detalhes),
        lembretes,
      };
    },

    async criarTarefa(entrada: EntradaCriarTarefa): Promise<ResultadoCriarTarefa> {
      const corpo: Record<string, unknown> = {
        titulo: entrada.titulo,
      };
      if (entrada.tarefaPaiId !== undefined) {
        corpo.tarefa_pai_id = entrada.tarefaPaiId;
      }
      if (entrada.prioridade !== undefined) {
        corpo.prioridade = entrada.prioridade;
      }
      if (entrada.status !== undefined) {
        corpo.status = entrada.status;
      }
      if (entrada.turno !== undefined) {
        corpo.turno = entrada.turno;
      }
      if (entrada.prazo !== undefined) {
        corpo.prazo = entrada.prazo;
      }
      if (entrada.recorrencia !== undefined) {
        corpo.recorrencia = serializarRecorrencia(entrada.recorrencia);
      }
      if (entrada.etiquetaIds !== undefined) {
        corpo.etiqueta_ids = entrada.etiquetaIds;
      }

      const resp = await requisitarJson<CriarTarefaApiCrua>(
        '/api/tarefas',
        { method: 'POST', body: JSON.stringify(corpo) },
        funcaoFetch,
      );
      return {
        tarefa: mapearTarefa(resp.tarefa),
        ancestraisAtualizados: resp.ancestrais_atualizados.map((anc) => ({
          id: anc.id,
          status: anc.status,
          percentualConclusao: anc.percentual_conclusao,
          totalFolhas: anc.total_folhas,
          folhasConcluidas: anc.folhas_concluidas,
          temFilhaUrgenteAberta: anc.tem_filha_urgente_aberta,
        })),
      };
    },

    async atualizarTarefa(
      tarefaId: string,
      entrada: EntradaAtualizarTarefa,
    ): Promise<TarefaArvore> {
      const corpo: Record<string, unknown> = {};
      if (entrada.titulo !== undefined) {
        corpo.titulo = entrada.titulo;
      }
      if (entrada.prioridade !== undefined) {
        corpo.prioridade = entrada.prioridade;
      }
      if (entrada.status !== undefined) {
        corpo.status = entrada.status;
      }
      if (entrada.turno !== undefined) {
        corpo.turno = entrada.turno;
      }
      if (entrada.prazo !== undefined) {
        corpo.prazo = entrada.prazo;
      }
      if (entrada.recorrencia !== undefined) {
        corpo.recorrencia = serializarRecorrencia(entrada.recorrencia);
      }
      if (entrada.etiquetaIds !== undefined) {
        corpo.etiqueta_ids = entrada.etiquetaIds;
      }

      const resp = await requisitarJson<TarefaApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}`,
        { method: 'PATCH', body: JSON.stringify(corpo) },
        funcaoFetch,
      );
      return mapearTarefa(resp);
    },

    async concluirTarefa(
      tarefaId: string,
      confirmarCascata: boolean,
    ): Promise<ResultadoConcluirTarefa> {
      const resp = await requisitarJson<ConcluirTarefaApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}/concluir`,
        { method: 'POST', body: JSON.stringify({ confirmar_cascata: confirmarCascata }) },
        funcaoFetch,
      );
      return {
        tarefaId: resp.tarefa_id,
        nosConcluidos: resp.nos_concluidos,
        ancestraisAtualizados: resp.ancestrais_atualizados,
        tokenDesfazer: resp.token_desfazer,
        expiraEm: resp.expira_em,
        proximaOcorrencia: resp.proxima_ocorrencia
          ? {
              id: resp.proxima_ocorrencia.id,
              prazo: resp.proxima_ocorrencia.prazo,
              serieRecorrenciaId: resp.proxima_ocorrencia.serie_recorrencia_id,
            }
          : null,
      };
    },

    async desfazerCascata(tokenDesfazer: string): Promise<ResultadoDesfazerCascata> {
      const resp = await requisitarJson<DesfazerCascataApiCrua>(
        '/api/tarefas/desfazer-cascata',
        { method: 'POST', body: JSON.stringify({ token_desfazer: tokenDesfazer }) },
        funcaoFetch,
      );
      return {
        restaurados: resp.restaurados,
        tarefaId: resp.tarefa_id,
      };
    },

    async reabrirTarefa(
      tarefaId: string,
      statusDestino: 'pendente' | 'em_andamento' = 'em_andamento',
    ): Promise<ResultadoReabrirTarefa> {
      const resp = await requisitarJson<ReabrirTarefaApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}/reabrir`,
        { method: 'POST', body: JSON.stringify({ status_destino: statusDestino }) },
        funcaoFetch,
      );
      return {
        tarefaId: resp.tarefa_id,
        status: resp.status,
        nosReabertos: resp.nos_reabertos,
        ancestraisReabertos: resp.ancestrais_reabertos,
      };
    },

    async moverTarefa(
      tarefaId: string,
      novoPaiId: string | null,
      novaOrdem: number | null = null,
    ): Promise<ResultadoMoverTarefa> {
      const resp = await requisitarJson<MoverTarefaApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}/mover`,
        {
          method: 'POST',
          body: JSON.stringify({ novo_pai_id: novoPaiId, nova_ordem: novaOrdem }),
        },
        funcaoFetch,
      );
      return {
        tarefa: mapearTarefa(resp.tarefa),
        ancestraisConcluidos: resp.ancestrais_concluidos,
        ancestraisReabertos: resp.ancestrais_reabertos,
      };
    },

    async reordenarIrmas(
      tarefaPaiId: string | null,
      ordenacao: ItemOrdenacaoIrma[],
    ): Promise<number> {
      const resp = await requisitarJson<{ atualizadas: number }>(
        '/api/tarefas/reordenar',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tarefa_pai_id: tarefaPaiId,
            ordenacao: ordenacao.map((item) => ({
              tarefa_id: item.tarefaId,
              ordem_manual: item.ordemManual,
            })),
          }),
        },
        funcaoFetch,
      );
      return resp.atualizadas;
    },

    async excluirTarefa(
      tarefaId: string,
      estrategia?: EstrategiaExclusao,
    ): Promise<ResultadoExcluirTarefa> {
      const qs = estrategia ? `?estrategia=${encodeURIComponent(estrategia)}` : '';
      const resp = await requisitarJson<ExcluirTarefaApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}${qs}`,
        { method: 'DELETE' },
        funcaoFetch,
      );
      return {
        estrategiaAplicada: resp.estrategia_aplicada,
        tarefasRemovidas: resp.tarefas_removidas,
        filhasPromovidas: resp.filhas_promovidas,
      };
    },

    async salvarDetalhes(tarefaId, entrada): Promise<DetalhesTarefa> {
      const resp = await requisitarJson<DetalhesApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}/detalhes`,
        {
          method: 'PUT',
          body: JSON.stringify({
            metadados_visuais: serializarMetadadosVisuais(entrada.metadadosVisuais),
            notas_em_blocos: entrada.notasEmBlocos,
          }),
        },
        funcaoFetch,
      );
      return mapearDetalhes(resp);
    },

    async listarEtiquetas(): Promise<ListaEtiquetasResposta> {
      const resp = await requisitarJson<ListaEtiquetasApiCrua>(
        '/api/etiquetas',
        { method: 'GET' },
        funcaoFetch,
      );
      return {
        itens: resp.itens.map(mapearEtiquetaCompleta),
        limiteMaximo: resp.limite_maximo,
      };
    },

    async criarEtiqueta(entrada): Promise<EtiquetaCompleta> {
      const resp = await requisitarJson<EtiquetaApiCrua>(
        '/api/etiquetas',
        { method: 'POST', body: JSON.stringify(entrada) },
        funcaoFetch,
      );
      return mapearEtiquetaCompleta(resp);
    },

    async atualizarEtiqueta(etiquetaId, entrada): Promise<EtiquetaCompleta> {
      const corpo: Record<string, string> = {};
      if (entrada.nome !== undefined) {
        corpo.nome = entrada.nome;
      }
      if (entrada.cor !== undefined) {
        corpo.cor = entrada.cor;
      }
      const resp = await requisitarJson<EtiquetaApiCrua>(
        `/api/etiquetas/${encodeURIComponent(etiquetaId)}`,
        { method: 'PATCH', body: JSON.stringify(corpo) },
        funcaoFetch,
      );
      return mapearEtiquetaCompleta(resp);
    },

    async excluirEtiqueta(etiquetaId: string): Promise<void> {
      await requisitarJson<void>(
        `/api/etiquetas/${encodeURIComponent(etiquetaId)}`,
        { method: 'DELETE' },
        funcaoFetch,
      );
    },

    async buscarCidades(consulta: string): Promise<SugestaoCidadeClima[]> {
      const resp = await requisitarJson<BuscaCidadesApiCrua>(
        `/api/clima/cidades?q=${encodeURIComponent(consulta.trim())}`,
        { method: 'GET' },
        funcaoFetch,
      );
      return resp.itens.map((item) => ({
        cidade: item.cidade,
        uf: item.uf,
        pais: item.pais,
        latitudeAprox: item.latitude_aprox,
        longitudeAprox: item.longitude_aprox,
      }));
    },

    async atualizarConsentimentoClima(
      entrada: EntradaConsentimentoClima,
    ): Promise<ResultadoConsentimentoClima> {
      const resp = await requisitarJson<ConsentimentoClimaApiCrua>(
        '/api/clima/consentimento',
        {
          method: 'PUT',
          body: JSON.stringify({
            habilitado: entrada.habilitado,
            modo_localizacao: entrada.modoLocalizacao ?? null,
            cidade: entrada.cidade ?? null,
            uf: entrada.uf ?? null,
            latitude_aprox: entrada.latitudeAprox ?? null,
            longitude_aprox: entrada.longitudeAprox ?? null,
          }),
        },
        funcaoFetch,
      );
      return {
        habilitado: resp.habilitado,
        modoLocalizacao: resp.modo_localizacao,
        cidade: resp.cidade,
        uf: resp.uf,
        latitudeAprox: resp.latitude_aprox,
        longitudeAprox: resp.longitude_aprox,
        estadoClimatico: resp.estado_climatico,
      };
    },

    async consultarClimaAtual(): Promise<EstadoClimaUsuario> {
      try {
        const resp = await requisitarJson<ClimaAtualApiCrua>(
          '/api/clima/atual',
          { method: 'GET' },
          funcaoFetch,
        );
        return {
          autorizado: true,
          clima: {
            habilitado: resp.habilitado,
            cidade: resp.cidade,
            uf: resp.uf,
            temperaturaC: resp.temperatura_c,
            codigoWmo: resp.codigo_wmo,
            estadoClimatico: resp.estado_climatico,
            descricao: resp.descricao,
            origemCache: resp.origem_cache,
            atualizadoEm: resp.atualizado_em,
          },
        };
      } catch (erro) {
        if (
          erro instanceof ErroApi &&
          erro.status === 403 &&
          erro.codigo === 'CLIMA_NAO_AUTORIZADO'
        ) {
          return { autorizado: false, clima: null };
        }
        throw erro;
      }
    },
  };
}
