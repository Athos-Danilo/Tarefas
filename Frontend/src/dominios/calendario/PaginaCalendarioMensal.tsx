import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Repeat,
} from 'lucide-react';
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import { calcularFaseLunar } from '../../astronomia/fase-lunar';
import type { PrioridadeTarefa } from '../../astronomia/tipos';
import { LuaFaseSvg } from '../../cenario/LuaFaseSvg';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { ErroApi } from '../../servicos/cliente-http';
import { criarServicoPush } from '../../servicos/cliente-push';
import type {
  DiaCalendarioResumo,
  ItemCalendarioTarefa,
  ServicoCalendarioFrontend,
} from '../../servicos/tipos-calendario';
import type {
  EntradaAtribuirResponsavel,
  ServicoGruposFrontend,
} from '../../servicos/tipos-grupos';
import type {
  BlocoNota,
  EntradaAtualizarTarefa,
  MetadadosVisuaisTarefa,
  ServicoJornadaFrontend,
  TurnoTarefa,
} from '../../servicos/tipos-jornada';
import type { EntradaCriarLembrete, ServicoPushFrontend } from '../../servicos/tipos-push';
import { GavetaEdicaoTarefa } from '../jornada/GavetaEdicaoTarefa';
import { ORDEM_TURNOS, ROTULOS_PRIORIDADE, ROTULOS_TURNO } from '../jornada/logica-jornada';
import {
  avancarMes,
  DIAS_SEMANA_CABECALHO,
  extrairAnoMesDeIso,
  formatarDataIsoLocal,
  formatarTituloMesAno,
  gerarGradeMensal,
  navegarDiaPorTeclado,
  resolverFusoHorarioCliente,
} from './logica-calendario';

export interface PropriedadesPaginaCalendarioMensal {
  reduzirMovimento: boolean;
  servicoJornada: ServicoJornadaFrontend;
  servicoGrupos: ServicoGruposFrontend;
  servicoCalendario: ServicoCalendarioFrontend;
  servicoPush?: ServicoPushFrontend;
  dataReferenciaInicial?: Date;
}

const CORES_INDICADOR_PRIORIDADE: Record<PrioridadeTarefa, string> = {
  baixa: 'bg-slate-400',
  media: 'bg-sky-400',
  alta: 'bg-amber-400',
  urgente: 'bg-rose-500',
};

function encontrarRaizId(
  raizes: readonly { id: string; compartilhada: boolean; subtarefas: readonly unknown[] }[],
  alvoId: string,
): string | null {
  const contem = (no: { id: string; subtarefas: readonly unknown[] }): boolean => {
    if (no.id === alvoId) {
      return true;
    }
    return (no.subtarefas as { id: string; subtarefas: readonly unknown[] }[]).some(contem);
  };
  const raiz = raizes.find((item) => contem(item));
  return raiz?.compartilhada ? raiz.id : null;
}

export function PaginaCalendarioMensal({
  reduzirMovimento,
  servicoJornada,
  servicoGrupos,
  servicoCalendario,
  servicoPush,
  dataReferenciaInicial,
}: PropriedadesPaginaCalendarioMensal) {
  const queryClient = useQueryClient();
  const gradeRef = useRef<HTMLDivElement | null>(null);
  const fusoHorario = useMemo(() => resolverFusoHorarioCliente(), []);
  const pushEfetivo = useMemo(() => servicoPush ?? criarServicoPush(), [servicoPush]);

  const [janela, setJanela] = useState(() => {
    const ref = dataReferenciaInicial ?? new Date();
    return {
      ano: ref.getFullYear(),
      mes: ref.getMonth() + 1,
    };
  });
  const [dataSelecionadaIso, setDataSelecionadaIso] = useState(() =>
    formatarDataIsoLocal(dataReferenciaInicial ?? new Date()),
  );
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeTarefa | ''>('');
  const [filtroTurno, setFiltroTurno] = useState<TurnoTarefa | ''>('');
  const [tarefaDetalhesId, setTarefaDetalhesId] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const calendarioQuery = useQuery({
    queryKey: [
      'calendario-mensal',
      janela.ano,
      janela.mes,
      fusoHorario,
      filtroPrioridade,
      filtroTurno,
    ],
    queryFn: () =>
      servicoCalendario.consultarMensal({
        ano: janela.ano,
        mes: janela.mes,
        fusoHorario,
        prioridade: filtroPrioridade,
        turno: filtroTurno,
      }),
  });

  const tarefasQuery = useQuery({
    queryKey: ['tarefas', 'calendario'],
    queryFn: () => servicoJornada.listarTarefas({ incluirConcluidas: true, formato: 'arvore' }),
  });

  const etiquetasQuery = useQuery({
    queryKey: ['etiquetas'],
    queryFn: () => servicoJornada.listarEtiquetas(),
  });

  const detalhesQuery = useQuery({
    queryKey: ['tarefa-detalhes', tarefaDetalhesId],
    enabled: tarefaDetalhesId !== null,
    queryFn: () => servicoJornada.obterTarefa(tarefaDetalhesId as string),
  });

  const raizes = useMemo(() => tarefasQuery.data?.itens ?? [], [tarefasQuery.data]);
  const raizCompartilhadaDaGaveta = useMemo(
    () => (tarefaDetalhesId ? encontrarRaizId(raizes, tarefaDetalhesId) : null),
    [raizes, tarefaDetalhesId],
  );

  const painelGrupoQuery = useQuery({
    queryKey: ['grupo-painel', raizCompartilhadaDaGaveta],
    enabled: raizCompartilhadaDaGaveta !== null,
    queryFn: () => servicoGrupos.obterDesempenhoGrupo(raizCompartilhadaDaGaveta as string),
  });

  const celulas = useMemo(() => gerarGradeMensal(janela.ano, janela.mes, 'sul'), [janela]);

  const mapaDiasApi = useMemo(() => {
    const mapa = new Map<string, DiaCalendarioResumo>();
    for (const dia of calendarioQuery.data?.dias ?? []) {
      mapa.set(dia.data, dia);
    }
    return mapa;
  }, [calendarioQuery.data]);

  const faseLunarSelecionada = useMemo(() => {
    const [aStr, mStr, dStr] = dataSelecionadaIso.split('-');
    const a = Number.parseInt(aStr ?? '', 10);
    const m = Number.parseInt(mStr ?? '', 10);
    const d = Number.parseInt(dStr ?? '', 10);
    if (Number.isFinite(a) && Number.isFinite(m) && Number.isFinite(d)) {
      return calcularFaseLunar(new Date(a, m - 1, d, 12, 0, 0), 'sul');
    }
    return calcularFaseLunar(new Date(), 'sul');
  }, [dataSelecionadaIso]);

  const resumoDiaSelecionado = mapaDiasApi.get(dataSelecionadaIso);

  const lidarErroMutacao = useCallback((erro: unknown) => {
    if (erro instanceof ErroApi) {
      setMensagemErro(erro.mensagem);
      return;
    }
    setMensagemErro('Não foi possível atualizar os dados no calendário.');
  }, []);

  const recarregarTudo = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['calendario-mensal'] }),
      queryClient.invalidateQueries({ queryKey: ['tarefas'] }),
    ]);
  }, [queryClient]);

  const alternarConclusaoMutation = useMutation({
    mutationFn: async (item: ItemCalendarioTarefa): Promise<void> => {
      if (item.status === 'concluida') {
        await servicoJornada.reabrirTarefa(item.id);
        return;
      }
      await servicoJornada.concluirTarefa(item.id, false);
    },
    onSuccess: async () => {
      setMensagemErro(null);
      await recarregarTudo();
    },
    onError: lidarErroMutacao,
  });

  const atualizarTarefaMutation = useMutation({
    mutationFn: (param: { tarefaId: string; entrada: EntradaAtualizarTarefa }) =>
      servicoJornada.atualizarTarefa(param.tarefaId, param.entrada),
    onSuccess: async () => {
      await recarregarTudo();
      if (tarefaDetalhesId) {
        await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
      }
    },
    onError: lidarErroMutacao,
  });

  const moverTarefaMutation = useMutation({
    mutationFn: (param: { tarefaId: string; novoPaiId: string | null }) =>
      servicoJornada.moverTarefa(param.tarefaId, param.novoPaiId),
    onSuccess: async () => {
      await recarregarTudo();
      if (tarefaDetalhesId) {
        await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
      }
    },
    onError: lidarErroMutacao,
  });

  const atribuirResponsavelMutation = useMutation({
    mutationFn: (param: { tarefaId: string; entrada: EntradaAtribuirResponsavel }) =>
      servicoGrupos.atribuirResponsavel(param.tarefaId, param.entrada),
    onSuccess: async () => {
      await recarregarTudo();
      if (tarefaDetalhesId) {
        await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
      }
    },
    onError: lidarErroMutacao,
  });

  const salvarDetalhesMutation = useMutation({
    mutationFn: (param: {
      tarefaId: string;
      entrada: { metadadosVisuais: MetadadosVisuaisTarefa; notasEmBlocos: BlocoNota[] };
    }) => servicoJornada.salvarDetalhes(param.tarefaId, param.entrada),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
    },
    onError: lidarErroMutacao,
  });

  const criarLembreteMutation = useMutation({
    mutationFn: (param: { tarefaId: string; entrada: EntradaCriarLembrete }) =>
      pushEfetivo.criarLembrete(param.tarefaId, param.entrada),
    onSuccess: async (_criado, variaveis) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', variaveis.tarefaId] }),
        recarregarTudo(),
      ]);
    },
    onError: lidarErroMutacao,
  });

  const cancelarLembreteMutation = useMutation({
    mutationFn: (param: { lembreteId: string; tarefaId: string }) =>
      pushEfetivo.cancelarLembrete(param.lembreteId),
    onSuccess: async (_res, variaveis) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', variaveis.tarefaId] }),
        recarregarTudo(),
      ]);
    },
    onError: lidarErroMutacao,
  });

  const lidarMudarMes = (delta: number) => {
    const proximo = avancarMes(janela.ano, janela.mes, delta);
    setJanela(proximo);
    const mm = String(proximo.mes).padStart(2, '0');
    setDataSelecionadaIso(`${proximo.ano}-${mm}-01`);
  };

  const lidarTeclaCelula = (dataIsoAtual: string, evento: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(evento.key)) {
      return;
    }
    evento.preventDefault();
    const proximoDia = navegarDiaPorTeclado(dataIsoAtual, evento.key);
    setDataSelecionadaIso(proximoDia);
    const meta = extrairAnoMesDeIso(proximoDia);
    if (meta && (meta.ano !== janela.ano || meta.mes !== janela.mes)) {
      setJanela(meta);
    }
    queueMicrotask(() => {
      const botaoAlvo = gradeRef.current?.querySelector<HTMLButtonElement>(
        `button[data-data-iso="${proximoDia}"]`,
      );
      botaoAlvo?.focus();
    });
  };

  return (
    <div className="space-y-5">
      <CartaoBento className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[var(--primaria)]" aria-hidden="true" />
              <h1 className="font-['Fraunces',serif] text-2xl font-bold text-[var(--texto)]">
                Calendário Mensal
              </h1>
            </div>
            <p className="mt-1 text-xs text-[var(--texto-sec)]">
              Prazos reais, ocorrências recorrentes previstas e fase lunar diária no fuso{' '}
              <span className="font-mono">{fusoHorario}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Botao
              type="button"
              variante="secundario"
              tamanho="sm"
              reduzirMovimento={reduzirMovimento}
              aria-label="Mês anterior"
              onClick={() => lidarMudarMes(-1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Anterior</span>
            </Botao>

            <span className="min-w-36 text-center text-sm font-bold text-[var(--texto)]">
              {formatarTituloMesAno(janela.ano, janela.mes)}
            </span>

            <Botao
              type="button"
              variante="secundario"
              tamanho="sm"
              reduzirMovimento={reduzirMovimento}
              aria-label="Próximo mês"
              onClick={() => lidarMudarMes(1)}
            >
              <span>Próximo</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Botao>

            <label className="sr-only" htmlFor="filtro-prioridade-calendario">
              Filtrar prioridade
            </label>
            <select
              id="filtro-prioridade-calendario"
              aria-label="Filtrar prioridade"
              value={filtroPrioridade}
              onChange={(evento) =>
                setFiltroPrioridade(evento.target.value as PrioridadeTarefa | '')
              }
              className="min-h-9 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-xs font-medium text-[var(--texto)]"
            >
              <option value="">Todas as prioridades</option>
              {(['baixa', 'media', 'alta', 'urgente'] as const).map((p) => (
                <option key={p} value={p}>
                  {ROTULOS_PRIORIDADE[p]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filtro-turno-calendario">
              Filtrar turno
            </label>
            <select
              id="filtro-turno-calendario"
              aria-label="Filtrar turno"
              value={filtroTurno}
              onChange={(evento) => setFiltroTurno(evento.target.value as TurnoTarefa | '')}
              className="min-h-9 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-xs font-medium text-[var(--texto)]"
            >
              <option value="">Todos os turnos</option>
              {ORDEM_TURNOS.map((t) => (
                <option key={t} value={t}>
                  {ROTULOS_TURNO[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mensagemErro && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {mensagemErro}
          </p>
        )}
      </CartaoBento>

      <div className="grid gap-5 lg:grid-cols-12">
        <CartaoBento className="p-4 sm:p-5 lg:col-span-8">
          <div ref={gradeRef} role="grid" aria-label={formatarTituloMesAno(janela.ano, janela.mes)}>
            <div role="row" className="mb-2 grid grid-cols-7 gap-1.5 text-center">
              {DIAS_SEMANA_CABECALHO.map((diaSemana) => (
                <div
                  key={diaSemana}
                  role="columnheader"
                  className="py-1 text-xs font-semibold text-[var(--texto-sec)]"
                >
                  {diaSemana}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {celulas.map((celula) => {
                const resumo = mapaDiasApi.get(celula.dataIso);
                const selecionado = celula.dataIso === dataSelecionadaIso;
                const descricaoDia = resumo
                  ? `Dia ${celula.diaNumero}, ${celula.faseLunar.nome}, ${resumo.totalTarefas} tarefa(s)`
                  : `Dia ${celula.diaNumero}, ${celula.faseLunar.nome}, sem tarefas`;

                return (
                  <div key={celula.dataIso} role="gridcell" className="min-w-0">
                    <button
                      type="button"
                      data-data-iso={celula.dataIso}
                      aria-label={descricaoDia}
                      aria-pressed={selecionado}
                      onClick={() => {
                        setDataSelecionadaIso(celula.dataIso);
                        if (!celula.pertenceAoMes) {
                          setJanela({ ano: celula.ano, mes: celula.mes });
                        }
                      }}
                      onKeyDown={(evento) => lidarTeclaCelula(celula.dataIso, evento)}
                      className={`flex min-h-20 w-full flex-col justify-between rounded-2xl border p-2 text-left transition-all ${
                        selecionado
                          ? 'border-[var(--primaria)] bg-[var(--primaria)]/15 ring-2 ring-[var(--primaria)]/50'
                          : 'border-[var(--borda)] bg-[var(--superficie-alt)] hover:border-[var(--primaria)]/50'
                      } ${celula.pertenceAoMes ? '' : 'opacity-45'}`}
                    >
                      <div className="flex w-full items-start justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-[var(--texto)]">
                          {celula.diaNumero}
                        </span>
                        <LuaFaseSvg dadosFaseLunar={celula.faseLunar} cx={12} cy={12} raio={7} />
                      </div>

                      {resumo ? (
                        <div className="mt-1 flex w-full flex-wrap items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${CORES_INDICADOR_PRIORIDADE[resumo.maiorPrioridade]}`}
                            title={`Prioridade ${ROTULOS_PRIORIDADE[resumo.maiorPrioridade]}`}
                          />
                          <span className="font-mono text-[10px] font-semibold text-[var(--texto)]">
                            {resumo.totalTarefas}
                          </span>
                          {resumo.temRecorrente && (
                            <Repeat className="h-3 w-3 text-[var(--primaria)]" aria-hidden="true" />
                          )}
                          {resumo.temAtrasada && (
                            <AlertTriangle className="h-3 w-3 text-rose-400" aria-hidden="true" />
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--texto-sec)]">
                          {celula.faseLunar.percentualIluminado}%
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </CartaoBento>

        <CartaoBento className="flex flex-col gap-4 p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--borda)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--texto)]">Dia {dataSelecionadaIso}</h2>
              <p className="text-xs text-[var(--texto-sec)]">
                {faseLunarSelecionada.nome} · {faseLunarSelecionada.percentualIluminado}% iluminada
              </p>
            </div>
            <LuaFaseSvg dadosFaseLunar={faseLunarSelecionada} cx={18} cy={18} raio={14} />
          </div>

          {calendarioQuery.isPending ? (
            <p className="text-xs text-[var(--texto-sec)]">Carregando prazos do mês...</p>
          ) : !resumoDiaSelecionado ? (
            <p className="rounded-xl bg-[var(--superficie-alt)] p-3 text-xs text-[var(--texto-sec)]">
              Nenhum prazo ou recorrência prevista para este dia com os filtros atuais.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {resumoDiaSelecionado.tarefas.map((item) => {
                const concluida = item.status === 'concluida';
                return (
                  <li
                    key={`${item.id}-${item.ehProjecao ? 'proj' : 'real'}`}
                    className="space-y-2 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            concluida
                              ? 'text-[var(--texto-sec)] line-through'
                              : 'text-[var(--texto)]'
                          }`}
                        >
                          {item.titulo}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--texto-sec)]">
                          <span>{ROTULOS_PRIORIDADE[item.prioridade]}</span>
                          <span>·</span>
                          <span>{ROTULOS_TURNO[item.turno]}</span>
                          {item.atrasada && (
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-semibold text-rose-400">
                              Atrasada
                            </span>
                          )}
                          {item.ehProjecao && (
                            <span className="rounded bg-[var(--primaria)]/15 px-1.5 py-0.5 font-semibold text-[var(--primaria)]">
                              Ocorrência recorrente prevista
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!item.ehProjecao && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={alternarConclusaoMutation.isPending}
                          aria-label={
                            concluida
                              ? `Reabrir tarefa ${item.titulo}`
                              : `Concluir tarefa ${item.titulo}`
                          }
                          onClick={() => alternarConclusaoMutation.mutate(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--borda)] px-2.5 py-1 text-xs font-semibold text-[var(--texto)] hover:border-[var(--primaria)]"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{concluida ? 'Reabrir' : 'Concluir'}</span>
                        </button>

                        <button
                          type="button"
                          aria-label={`Abrir detalhes de ${item.titulo}`}
                          onClick={() => setTarefaDetalhesId(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--primaria)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--primaria)] hover:bg-[var(--primaria)]/25"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Detalhes</span>
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CartaoBento>
      </div>

      <GavetaEdicaoTarefa
        aberto={tarefaDetalhesId !== null}
        detalhe={detalhesQuery.data ?? null}
        carregando={detalhesQuery.isPending}
        arvoreCompleta={raizes}
        etiquetas={etiquetasQuery.data?.itens ?? []}
        painelGrupo={painelGrupoQuery.data ?? null}
        salvandoTarefa={atualizarTarefaMutation.isPending}
        salvandoDetalhes={salvarDetalhesMutation.isPending}
        movendo={moverTarefaMutation.isPending}
        atribuindoResponsavel={atribuirResponsavelMutation.isPending}
        salvandoLembrete={criarLembreteMutation.isPending || cancelarLembreteMutation.isPending}
        aoFechar={() => setTarefaDetalhesId(null)}
        aoAtualizarTarefa={(tarefaId, entrada) =>
          atualizarTarefaMutation.mutateAsync({ tarefaId, entrada }).then(() => undefined)
        }
        aoMoverTarefa={(tarefaId, novoPaiId) =>
          moverTarefaMutation.mutateAsync({ tarefaId, novoPaiId }).then(() => undefined)
        }
        aoAtribuirResponsavel={(tarefaId, entrada) =>
          atribuirResponsavelMutation.mutateAsync({ tarefaId, entrada }).then(() => undefined)
        }
        aoSalvarDetalhes={(tarefaId, entrada) =>
          salvarDetalhesMutation.mutateAsync({ tarefaId, entrada }).then(() => undefined)
        }
        aoCriarLembrete={(tarefaId, entrada) =>
          criarLembreteMutation.mutateAsync({ tarefaId, entrada }).then(() => undefined)
        }
        aoCancelarLembrete={(lembreteId, tarefaId) =>
          cancelarLembreteMutation.mutateAsync({ lembreteId, tarefaId }).then(() => undefined)
        }
        reduzirMovimento={reduzirMovimento}
      />
    </div>
  );
}
