import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Compass, History, Pause, Play, Square, Timer, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { DadosFaseLunar } from '../../astronomia/fase-lunar';
import type { MomentoDoDia } from '../../astronomia/tipos';
import { useEstadoAudio } from '../../audio/estado-audio';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { ErroApi } from '../../servicos/cliente-http';
import type {
  EntradaIniciarSessaoFoco,
  ServicoFocoFrontend,
  SessaoFoco,
} from '../../servicos/tipos-foco';
import type { ServicoJornadaFrontend, TarefaArvore } from '../../servicos/tipos-jornada';
import {
  achatarTarefasParaSelecao,
  calcularSegundosRestantesIniciais,
  DURACAO_MINUTOS_MAX,
  DURACAO_MINUTOS_MIN,
  extrairSubtarefasImediatas,
  formatarCronometroSegundos,
  PRESETS_DURACAO_FOCO,
  resolverTemaTemporizador,
} from './logica-foco';
import { TemporizadorSolarLunar } from './TemporizadorSolarLunar';

export interface PropriedadesPaginaModoFoco {
  momentoDoDia: MomentoDoDia;
  faseLunar: DadosFaseLunar;
  reduzirMovimento: boolean;
  servicoJornada: ServicoJornadaFrontend;
  servicoFoco: ServicoFocoFrontend;
  aoMudarModoContemplativo?: (ativo: boolean) => void;
}

interface EstadoRelogioFoco {
  sessaoId: string;
  restantesSeg: number;
  pausado: boolean;
}

const ROTULOS_STATUS_SESSAO = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  interrompida: 'Interrompida',
} as const;

export function PaginaModoFoco({
  momentoDoDia,
  faseLunar,
  reduzirMovimento,
  servicoJornada,
  servicoFoco,
  aoMudarModoContemplativo,
}: PropriedadesPaginaModoFoco) {
  const queryClient = useQueryClient();
  const temaTemporizador = resolverTemaTemporizador(momentoDoDia);

  const [tarefaSelecionadaManualId, setTarefaSelecionadaManualId] = useState<string | null>(null);
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(25);
  const [estadoRelogio, setEstadoRelogio] = useState<EstadoRelogioFoco | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const tarefasQuery = useQuery({
    queryKey: ['tarefas', 'foco'],
    queryFn: () => servicoJornada.listarTarefas({ incluirConcluidas: true, formato: 'arvore' }),
  });

  const sessaoAtivaQuery = useQuery({
    queryKey: ['foco-ativa'],
    queryFn: () => servicoFoco.obterSessaoAtiva(),
  });

  const historicoQuery = useQuery({
    queryKey: ['foco-historico'],
    queryFn: () => servicoFoco.listarHistorico(20),
  });

  const raizes = useMemo(() => tarefasQuery.data?.itens ?? [], [tarefasQuery.data]);
  const opcoesTarefas = useMemo(() => achatarTarefasParaSelecao(raizes), [raizes]);
  const sessaoAtiva = sessaoAtivaQuery.data ?? null;

  const tarefaAlvoId = useMemo(() => {
    if (sessaoAtiva) {
      return sessaoAtiva.tarefaId;
    }
    if (
      tarefaSelecionadaManualId &&
      opcoesTarefas.some((op) => op.id === tarefaSelecionadaManualId)
    ) {
      return tarefaSelecionadaManualId;
    }
    const primeiraAberta = opcoesTarefas.find((op) => op.status !== 'concluida');
    return primeiraAberta?.id ?? opcoesTarefas[0]?.id ?? null;
  }, [opcoesTarefas, sessaoAtiva, tarefaSelecionadaManualId]);

  const subtarefasImediatas = useMemo(
    () => extrairSubtarefasImediatas(raizes, tarefaAlvoId),
    [raizes, tarefaAlvoId],
  );

  const duracaoPlanejadaAtiva = sessaoAtiva ? sessaoAtiva.duracaoPlanejadaSeg : duracaoMinutos * 60;

  const estaPausado = Boolean(
    sessaoAtiva && estadoRelogio?.sessaoId === sessaoAtiva.id && estadoRelogio.pausado,
  );

  const segundosRestantes = useMemo(() => {
    if (!sessaoAtiva) {
      return duracaoMinutos * 60;
    }
    if (estadoRelogio && estadoRelogio.sessaoId === sessaoAtiva.id) {
      return estadoRelogio.restantesSeg;
    }
    return calcularSegundosRestantesIniciais(
      sessaoAtiva.duracaoPlanejadaSeg,
      sessaoAtiva.iniciadaEm,
    );
  }, [duracaoMinutos, estadoRelogio, sessaoAtiva]);

  useEffect(() => {
    aoMudarModoContemplativo?.(Boolean(sessaoAtiva));
    return () => {
      aoMudarModoContemplativo?.(false);
    };
  }, [aoMudarModoContemplativo, sessaoAtiva]);

  useEffect(() => {
    if (!sessaoAtiva || estaPausado) {
      return;
    }
    const sessaoId = sessaoAtiva.id;
    const planejadaSeg = sessaoAtiva.duracaoPlanejadaSeg;
    const iniciadaEm = sessaoAtiva.iniciadaEm;

    const idIntervalo = setInterval(() => {
      setEstadoRelogio((anterior) => {
        const base =
          anterior && anterior.sessaoId === sessaoId
            ? anterior.restantesSeg
            : calcularSegundosRestantesIniciais(planejadaSeg, iniciadaEm);
        return {
          sessaoId,
          restantesSeg: Math.max(0, base - 1),
          pausado: false,
        };
      });
    }, 1000);

    return () => {
      clearInterval(idIntervalo);
    };
  }, [estaPausado, sessaoAtiva]);

  const lidarErroMutacao = useCallback((erro: unknown) => {
    if (erro instanceof ErroApi) {
      setMensagemErro(erro.mensagem);
      return;
    }
    setMensagemErro('Não foi possível atualizar a sessão de foco.');
  }, []);

  const iniciarMutation = useMutation({
    mutationFn: (entrada: EntradaIniciarSessaoFoco) => servicoFoco.iniciarSessao(entrada),
    onSuccess: async (novaSessao) => {
      setMensagemErro(null);
      useEstadoAudio.getState().tocarEfeito('foco_iniciado');
      setEstadoRelogio({
        sessaoId: novaSessao.id,
        restantesSeg: novaSessao.duracaoPlanejadaSeg,
        pausado: false,
      });
      queryClient.setQueryData<SessaoFoco | null>(['foco-ativa'], novaSessao);
      await queryClient.invalidateQueries({ queryKey: ['foco-historico'] });
    },
    onError: lidarErroMutacao,
  });

  const concluirSessaoMutation = useMutation({
    mutationFn: (param: { sessaoId: string; duracaoRealSeg?: number }) =>
      servicoFoco.concluirSessao(param.sessaoId, param.duracaoRealSeg),
    onSuccess: async () => {
      setMensagemErro(null);
      useEstadoAudio.getState().tocarEfeito('foco_concluido');
      setEstadoRelogio(null);
      queryClient.setQueryData<SessaoFoco | null>(['foco-ativa'], null);
      await queryClient.invalidateQueries({ queryKey: ['foco-historico'] });
    },
    onError: lidarErroMutacao,
  });

  const interromperSessaoMutation = useMutation({
    mutationFn: (param: { sessaoId: string; duracaoRealSeg?: number }) =>
      servicoFoco.interromperSessao(param.sessaoId, param.duracaoRealSeg),
    onSuccess: async () => {
      setMensagemErro(null);
      useEstadoAudio.getState().tocarEfeito('foco_interrompido');
      setEstadoRelogio(null);
      queryClient.setQueryData<SessaoFoco | null>(['foco-ativa'], null);
      await queryClient.invalidateQueries({ queryKey: ['foco-historico'] });
    },
    onError: lidarErroMutacao,
  });

  const alternarSubtarefaMutation = useMutation({
    mutationFn: async (tarefa: TarefaArvore): Promise<void> => {
      if (tarefa.status === 'concluida') {
        await servicoJornada.reabrirTarefa(tarefa.id);
        return;
      }
      await servicoJornada.concluirTarefa(tarefa.id, tarefa.subtarefas.length > 0);
    },
    onSuccess: async () => {
      setMensagemErro(null);
      await queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
    onError: lidarErroMutacao,
  });

  const lidarAlternarPausa = () => {
    if (!sessaoAtiva) {
      return;
    }
    setEstadoRelogio({
      sessaoId: sessaoAtiva.id,
      restantesSeg: segundosRestantes,
      pausado: !estaPausado,
    });
  };

  const calcularDuracaoRealAtual = (): number | undefined => {
    if (!sessaoAtiva) {
      return undefined;
    }
    return Math.max(0, sessaoAtiva.duracaoPlanejadaSeg - segundosRestantes);
  };

  const ocupado =
    iniciarMutation.isPending ||
    concluirSessaoMutation.isPending ||
    interromperSessaoMutation.isPending;

  if (tarefasQuery.isPending || sessaoAtivaQuery.isPending) {
    return (
      <CartaoBento className="p-6">
        <p className="text-sm font-medium text-[var(--texto-sec)]">
          Preparando seu ambiente contemplativo no Modo Foco...
        </p>
      </CartaoBento>
    );
  }

  return (
    <div className="space-y-5">
      <CartaoBento className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-['Fraunces',serif] text-2xl font-bold text-[var(--texto)]">
              Modo Foco Imersivo
            </h1>
            <p className="mt-1 text-sm text-[var(--texto-sec)]">
              Concentre-se em uma única etapa com ritmo solar de dia ou lunar à noite.
            </p>
          </div>
          {sessaoAtiva && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primaria)]/15 px-3 py-1 text-xs font-semibold text-[var(--primaria)]">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Foco ativo: {sessaoAtiva.tarefaTitulo}</span>
            </span>
          )}
        </div>

        {mensagemErro && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {mensagemErro}
          </p>
        )}
      </CartaoBento>

      {opcoesTarefas.length === 0 && !sessaoAtiva ? (
        <CartaoBento className="flex flex-col items-center gap-4 p-8 text-center">
          <Timer className="h-9 w-9 text-[var(--primaria)]" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--texto)]">
              Nenhuma tarefa disponível para iniciar uma sessão de foco
            </h2>
            <p className="text-sm text-[var(--texto-sec)]">
              Crie uma tarefa ou subtarefa na Jornada do Dia para acompanhá-la pelo temporizador.
            </p>
          </div>
          <Link
            to="/jornada"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primaria)] px-4 py-2 text-sm font-semibold text-[var(--primaria-texto)]"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>Ir para Jornada do Dia</span>
          </Link>
        </CartaoBento>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <CartaoBento className="flex flex-col justify-between gap-5 p-5 sm:p-6 lg:col-span-7">
            <TemporizadorSolarLunar
              tema={temaTemporizador}
              faseLunar={faseLunar}
              duracaoPlanejadaSeg={duracaoPlanejadaAtiva}
              segundosRestantes={segundosRestantes}
              emExecucao={Boolean(sessaoAtiva)}
              pausado={estaPausado}
              reduzirMovimento={reduzirMovimento}
            />

            {!sessaoAtiva ? (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="seletor-tarefa-foco"
                    className="mb-1.5 block text-xs font-semibold text-[var(--texto-sec)]"
                  >
                    Tarefa em foco
                  </label>
                  <select
                    id="seletor-tarefa-foco"
                    value={tarefaAlvoId ?? ''}
                    onChange={(evento) => setTarefaSelecionadaManualId(evento.target.value)}
                    className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm font-medium text-[var(--texto)]"
                  >
                    {opcoesTarefas.map((opcao) => (
                      <option key={opcao.id} value={opcao.id}>
                        {'  '.repeat(opcao.nivel)}
                        {opcao.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[var(--texto-sec)]">
                    Duração planejada
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESETS_DURACAO_FOCO.map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setDuracaoMinutos(min)}
                        className={`min-h-10 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                          duracaoMinutos === min
                            ? 'border-[var(--primaria)] bg-[var(--primaria)] text-[var(--primaria-texto)]'
                            : 'border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]'
                        }`}
                      >
                        {min} min
                      </button>
                    ))}

                    <label className="sr-only" htmlFor="input-minutos-foco">
                      Minutos personalizados
                    </label>
                    <input
                      id="input-minutos-foco"
                      type="number"
                      min={DURACAO_MINUTOS_MIN}
                      max={DURACAO_MINUTOS_MAX}
                      value={duracaoMinutos}
                      onChange={(evento) => {
                        const numero = Number.parseInt(evento.target.value, 10);
                        if (Number.isFinite(numero)) {
                          setDuracaoMinutos(
                            Math.max(DURACAO_MINUTOS_MIN, Math.min(DURACAO_MINUTOS_MAX, numero)),
                          );
                        }
                      }}
                      aria-label="Minutos personalizados"
                      className="min-h-10 w-24 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-center text-sm text-[var(--texto)]"
                    />
                  </div>
                </div>

                <Botao
                  type="button"
                  tamanho="md"
                  reduzirMovimento={reduzirMovimento}
                  disabled={!tarefaAlvoId || ocupado}
                  onClick={() => {
                    if (!tarefaAlvoId) {
                      return;
                    }
                    iniciarMutation.mutate({
                      tarefaId: tarefaAlvoId,
                      duracaoPlanejadaSeg: duracaoMinutos * 60,
                    });
                  }}
                  className="w-full"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>{iniciarMutation.isPending ? 'Iniciando...' : 'Iniciar foco'}</span>
                </Botao>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Botao
                  type="button"
                  variante="secundario"
                  reduzirMovimento={reduzirMovimento}
                  disabled={ocupado}
                  onClick={lidarAlternarPausa}
                >
                  {estaPausado ? (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{estaPausado ? 'Retomar' : 'Pausar'}</span>
                </Botao>

                <Botao
                  type="button"
                  reduzirMovimento={reduzirMovimento}
                  disabled={ocupado}
                  onClick={() => {
                    concluirSessaoMutation.mutate({
                      sessaoId: sessaoAtiva.id,
                      duracaoRealSeg: calcularDuracaoRealAtual(),
                    });
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Concluir sessão</span>
                </Botao>

                <Botao
                  type="button"
                  variante="perigo"
                  reduzirMovimento={reduzirMovimento}
                  disabled={ocupado}
                  onClick={() => {
                    interromperSessaoMutation.mutate({
                      sessaoId: sessaoAtiva.id,
                      duracaoRealSeg: calcularDuracaoRealAtual(),
                    });
                  }}
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  <span>Interromper sessão</span>
                </Botao>
              </div>
            )}
          </CartaoBento>

          <div className="space-y-5 lg:col-span-5">
            <CartaoBento className="p-5">
              <h2 className="text-base font-bold text-[var(--texto)]">Subtarefas imediatas</h2>
              <p className="mt-0.5 text-xs text-[var(--texto-sec)]">
                Marque entregas desta etapa sem sair do Modo Foco.
              </p>

              {subtarefasImediatas.length === 0 ? (
                <p className="mt-4 rounded-xl bg-[var(--superficie-alt)] p-3 text-xs text-[var(--texto-sec)]">
                  Esta tarefa é uma etapa folha e não possui subtarefas filhas.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {subtarefasImediatas.map((sub) => {
                    const concluida = sub.status === 'concluida';
                    return (
                      <li
                        key={sub.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2"
                      >
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            concluida
                              ? 'text-[var(--texto-sec)] line-through'
                              : 'font-medium text-[var(--texto)]'
                          }`}
                        >
                          {sub.titulo}
                        </span>
                        <button
                          type="button"
                          disabled={alternarSubtarefaMutation.isPending}
                          aria-label={
                            concluida
                              ? `Reabrir subtarefa ${sub.titulo}`
                              : `Concluir subtarefa ${sub.titulo}`
                          }
                          onClick={() => alternarSubtarefaMutation.mutate(sub)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                            concluida
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-[var(--primaria)]/15 text-[var(--primaria)] hover:bg-[var(--primaria)]/25'
                          }`}
                        >
                          {concluida ? 'Concluída' : 'Concluir'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CartaoBento>

            <CartaoBento className="p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[var(--primaria)]" aria-hidden="true" />
                  <h2 className="text-base font-bold text-[var(--texto)]">Sessões recentes</h2>
                </div>
                <span className="font-mono text-xs text-[var(--texto-sec)]">
                  {Math.round((historicoQuery.data?.totalSegundosConcluidos ?? 0) / 60)} min focados
                </span>
              </div>

              {historicoQuery.isPending ? (
                <p className="mt-3 text-xs text-[var(--texto-sec)]">Carregando histórico...</p>
              ) : (historicoQuery.data?.itens.length ?? 0) === 0 ? (
                <p className="mt-3 text-xs text-[var(--texto-sec)]">
                  Nenhuma sessão registrada ainda.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {historicoQuery.data?.itens.slice(0, 6).map((sessao) => (
                    <li
                      key={sessao.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--texto)]">
                          {sessao.tarefaTitulo}
                        </p>
                        <p className="text-[var(--texto-sec)]">
                          {ROTULOS_STATUS_SESSAO[sessao.status]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[var(--texto-sec)]">
                        {sessao.status === 'interrompida' && (
                          <XCircle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                        )}
                        <span>
                          {formatarCronometroSegundos(
                            sessao.duracaoRealSeg ?? sessao.duracaoPlanejadaSeg,
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CartaoBento>
          </div>
        </div>
      )}
    </div>
  );
}
