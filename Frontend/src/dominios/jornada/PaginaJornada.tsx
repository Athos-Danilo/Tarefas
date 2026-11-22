import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Repeat,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { DadosFaseLunar } from '../../astronomia/fase-lunar';
import type { MomentoDoDia } from '../../astronomia/tipos';
import { BarraArcoDoDia } from '../../cenario/BarraArcoDoDia';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { useAutenticacao } from '../../hooks/usar-autenticacao';
import { ErroApi } from '../../servicos/cliente-http';
import type {
  FiltrosListagemTarefas,
  ItemOrdenacaoIrma,
  ProximaOcorrenciaResumo,
  ServicoJornadaFrontend,
  TarefaArvore,
} from '../../servicos/tipos-jornada';
import { BarraFiltrosEEtiquetas } from './BarraFiltrosEEtiquetas';
import { FormularioNovaTarefa, type PaiSelecionadoCriacao } from './FormularioNovaTarefa';
import { GavetaEdicaoTarefa } from './GavetaEdicaoTarefa';
import { ItemTarefaArvore } from './ItemTarefaArvore';
import {
  agruparRaizesPorTurno,
  calcularNovaOrdenacaoIrmas,
  calcularProgressoGeralJornada,
  ORDEM_TURNOS,
  ROTULOS_TURNO,
} from './logica-jornada';
import { MiniCardClimaOptIn } from './MiniCardClimaOptIn';

export interface PropriedadesPaginaJornada {
  minuto: number;
  momentoDoDia: MomentoDoDia;
  nomeMomento: string;
  faseLunar: DadosFaseLunar;
  reduzirMovimento: boolean;
  suporteWebGL: boolean;
  servico: ServicoJornadaFrontend;
  aoMudarProgressoJornada?: (progresso: number) => void;
}

function buscarIrmasComMesmoPai(
  raizesPorTurno: Record<string, TarefaArvore[]>,
  idA: string,
  idB: string,
): { tarefaPaiId: string | null; irmas: TarefaArvore[] } | null {
  for (const turno of ORDEM_TURNOS) {
    const listaTurno = raizesPorTurno[turno];
    if (listaTurno.some((t) => t.id === idA) && listaTurno.some((t) => t.id === idB)) {
      return { tarefaPaiId: null, irmas: listaTurno };
    }
  }

  const visitar = (
    nos: readonly TarefaArvore[],
  ): { tarefaPaiId: string | null; irmas: TarefaArvore[] } | null => {
    for (const no of nos) {
      if (no.subtarefas.some((s) => s.id === idA) && no.subtarefas.some((s) => s.id === idB)) {
        return { tarefaPaiId: no.id, irmas: no.subtarefas };
      }
      const achou = visitar(no.subtarefas);
      if (achou) {
        return achou;
      }
    }
    return null;
  };

  for (const turno of ORDEM_TURNOS) {
    const achou = visitar(raizesPorTurno[turno]);
    if (achou) {
      return achou;
    }
  }
  return null;
}

export function PaginaJornada({
  minuto,
  momentoDoDia,
  nomeMomento,
  faseLunar,
  reduzirMovimento,
  suporteWebGL,
  servico,
  aoMudarProgressoJornada,
}: PropriedadesPaginaJornada) {
  const { estadoSessao, tutorialSolicitadoRevisao } = useAutenticacao();
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState<FiltrosListagemTarefas>({ incluirConcluidas: true });
  const [exibirSimuladorArco, setExibirSimuladorArco] = useState(false);
  const [paiParaCriar, setPaiParaCriar] = useState<PaiSelecionadoCriacao | null>(null);
  const [tarefaEmEdicaoId, setTarefaEmEdicaoId] = useState<string | null>(null);
  const [tokenDesfazer, setTokenDesfazer] = useState<string | null>(null);
  const [proximaOcorrencia, setProximaOcorrencia] = useState<ProximaOcorrenciaResumo | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [confirmacaoCascata, setConfirmacaoCascata] = useState<{
    tarefaId: string;
    descendentesEmAberto: number;
  } | null>(null);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<{
    tarefaId: string;
    totalDescendentes: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const consultaTarefas = useQuery({
    queryKey: ['tarefas', filtros],
    queryFn: () => servico.listarTarefas(filtros),
    enabled: estadoSessao.autenticado,
  });

  const consultaEtiquetas = useQuery({
    queryKey: ['etiquetas'],
    queryFn: () => servico.listarEtiquetas(),
    enabled: estadoSessao.autenticado,
  });

  const consultaDetalhe = useQuery({
    queryKey: ['tarefa-detalhe', tarefaEmEdicaoId],
    queryFn: () => servico.obterTarefa(tarefaEmEdicaoId as string),
    enabled: Boolean(estadoSessao.autenticado && tarefaEmEdicaoId),
  });

  const raizes = useMemo(() => consultaTarefas.data?.itens ?? [], [consultaTarefas.data]);
  const progressoGeral = useMemo(() => calcularProgressoGeralJornada(raizes), [raizes]);
  const raizesPorTurno = useMemo(() => agruparRaizesPorTurno(raizes), [raizes]);
  const etiquetas = useMemo(() => consultaEtiquetas.data?.itens ?? [], [consultaEtiquetas.data]);
  const limiteEtiquetas = consultaEtiquetas.data?.limiteMaximo ?? 30;

  useEffect(() => {
    aoMudarProgressoJornada?.(progressoGeral);
  }, [progressoGeral, aoMudarProgressoJornada]);

  const invalidarTarefas = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    if (tarefaEmEdicaoId) {
      await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhe', tarefaEmEdicaoId] });
    }
  };

  const mutacaoCriar = useMutation({
    mutationFn: (entrada: Parameters<typeof servico.criarTarefa>[0]) =>
      servico.criarTarefa(entrada),
    onSuccess: async () => {
      setErroAcao(null);
      await invalidarTarefas();
    },
  });

  const mutacaoAtualizar = useMutation({
    mutationFn: ({
      id,
      entrada,
    }: {
      id: string;
      entrada: Parameters<typeof servico.atualizarTarefa>[1];
    }) => servico.atualizarTarefa(id, entrada),
    onSuccess: async () => {
      setErroAcao(null);
      await invalidarTarefas();
    },
  });

  const mutacaoConcluir = useMutation({
    mutationFn: ({ tarefaId, confirmarCascata }: { tarefaId: string; confirmarCascata: boolean }) =>
      servico.concluirTarefa(tarefaId, confirmarCascata),
    onSuccess: async (resultado) => {
      setErroAcao(null);
      setConfirmacaoCascata(null);
      setTokenDesfazer(resultado.tokenDesfazer);
      setProximaOcorrencia(resultado.proximaOcorrencia);
      await invalidarTarefas();
    },
    onError: (erro, variaveis) => {
      if (erro instanceof ErroApi && erro.codigo === 'CONFIRMACAO_CASCATA_OBRIGATORIA') {
        const desc = Number(erro.detalhes?.descendentes_em_aberto ?? 1);
        setConfirmacaoCascata({
          tarefaId: variaveis.tarefaId,
          descendentesEmAberto: desc,
        });
        return;
      }
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível concluir a tarefa.');
    },
  });

  const mutacaoDesfazer = useMutation({
    mutationFn: (token: string) => servico.desfazerCascata(token),
    onSuccess: async () => {
      setTokenDesfazer(null);
      setErroAcao(null);
      await invalidarTarefas();
    },
    onError: (erro) => {
      setTokenDesfazer(null);
      setErroAcao(erro instanceof Error ? erro.message : 'Janela para desfazer a cascata expirou.');
    },
  });

  const mutacaoReabrir = useMutation({
    mutationFn: (tarefaId: string) => servico.reabrirTarefa(tarefaId, 'em_andamento'),
    onSuccess: async () => {
      setErroAcao(null);
      await invalidarTarefas();
    },
    onError: (erro) => {
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível reabrir a tarefa.');
    },
  });

  const mutacaoMover = useMutation({
    mutationFn: ({ tarefaId, novoPaiId }: { tarefaId: string; novoPaiId: string | null }) =>
      servico.moverTarefa(tarefaId, novoPaiId, null),
    onSuccess: async () => {
      setErroAcao(null);
      await invalidarTarefas();
    },
  });

  const mutacaoReordenar = useMutation({
    mutationFn: ({
      tarefaPaiId,
      ordenacao,
    }: {
      tarefaPaiId: string | null;
      ordenacao: ItemOrdenacaoIrma[];
    }) => servico.reordenarIrmas(tarefaPaiId, ordenacao),
    onSuccess: async () => {
      setErroAcao(null);
      await invalidarTarefas();
    },
    onError: (erro) => {
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível reordenar as tarefas.');
    },
  });

  const mutacaoExcluir = useMutation({
    mutationFn: ({
      tarefaId,
      estrategia,
    }: {
      tarefaId: string;
      estrategia?: 'cascata' | 'promover_filhas';
    }) => servico.excluirTarefa(tarefaId, estrategia),
    onSuccess: async (_resultado, variaveis) => {
      setConfirmacaoExclusao(null);
      setErroAcao(null);
      if (tarefaEmEdicaoId === variaveis.tarefaId) {
        setTarefaEmEdicaoId(null);
      }
      await invalidarTarefas();
    },
    onError: (erro, variaveis) => {
      if (erro instanceof ErroApi && erro.codigo === 'CONFIRMACAO_ESTRATEGIA_OBRIGATORIA') {
        const totalDesc = Number(erro.detalhes?.total_descendentes ?? 1);
        setConfirmacaoExclusao({
          tarefaId: variaveis.tarefaId,
          totalDescendentes: totalDesc,
        });
        return;
      }
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível excluir a tarefa.');
    },
  });

  const mutacaoSalvarDetalhes = useMutation({
    mutationFn: ({
      tarefaId,
      entrada,
    }: {
      tarefaId: string;
      entrada: Parameters<typeof servico.salvarDetalhes>[1];
    }) => servico.salvarDetalhes(tarefaId, entrada),
    onSuccess: async (_detalhe, variaveis) => {
      await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhe', variaveis.tarefaId] });
    },
  });

  if (!estadoSessao.autenticado) {
    return null;
  }

  const { usuario } = estadoSessao;
  const avatarSrc = usuario.avatarUrl ?? '/assets-3d/avatares/sol-nascente.png';
  const totais = consultaTarefas.data?.totais;
  const ocupadoGeral =
    mutacaoConcluir.isPending ||
    mutacaoReabrir.isPending ||
    mutacaoExcluir.isPending ||
    mutacaoReordenar.isPending;

  const lidarDragEnd = (evento: DragEndEvent) => {
    const { active, over } = evento;
    if (!over || active.id === over.id) {
      return;
    }
    const resultado = buscarIrmasComMesmoPai(raizesPorTurno, String(active.id), String(over.id));
    if (!resultado) {
      return;
    }
    const ordenacao = calcularNovaOrdenacaoIrmas(
      resultado.irmas,
      String(active.id),
      String(over.id),
    );
    mutacaoReordenar.mutate({ tarefaPaiId: resultado.tarefaPaiId, ordenacao });
  };

  return (
    <div className="space-y-6">
      <CartaoBento destacado className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={avatarSrc}
            alt={`Avatar ativo de ${usuario.nomeExibicao}`}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full border border-[var(--borda)] object-cover"
          />
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primaria)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Espaço autenticado do Lume
            </span>
            <h1 className="fonte-display text-2xl font-bold text-[var(--texto)]">
              Olá, {usuario.nomeExibicao}
            </h1>
            <p className="font-mono text-xs text-[var(--texto-sec)]">
              Progresso do dia: {Math.round(progressoGeral * 100)}%
              {totais ? ` · ${totais.ativas} ativas / ${totais.concluidas} concluídas` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Botao
            type="button"
            variante="fantasma"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            onClick={() => setExibirSimuladorArco((atual) => !atual)}
          >
            <Sun className="h-4 w-4" aria-hidden="true" />
            <span>{exibirSimuladorArco ? 'Ocultar arco do dia' : 'Simular arco e clima'}</span>
            {exibirSimuladorArco ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </Botao>

          <Link
            to="/perfil"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-4 py-2 text-sm font-semibold text-[var(--texto)]"
          >
            <span>Gerenciar perfil e conta</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </CartaoBento>

      {tutorialSolicitadoRevisao ? (
        <CartaoBento role="status" className="border-l-4 border-l-[var(--primaria)]">
          <p className="text-sm font-medium text-[var(--texto)]">
            Revisão do Modo Tutorial solicitada. O tour interativo completo em 6 passos será
            acoplado na Fase 22.
          </p>
        </CartaoBento>
      ) : null}

      <MiniCardClimaOptIn
        minuto={minuto}
        nomeMomento={nomeMomento}
        faseLunar={faseLunar}
        servico={servico}
        reduzirMovimento={reduzirMovimento}
      />

      {exibirSimuladorArco ? (
        <BarraArcoDoDia
          minuto={minuto}
          momentoDoDia={momentoDoDia}
          nomeMomento={nomeMomento}
          faseLunar={faseLunar}
          reduzirMovimento={reduzirMovimento}
          suporteWebGL={suporteWebGL}
        />
      ) : null}

      {tokenDesfazer ? (
        <CartaoBento
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-[var(--secundaria)]"
        >
          <p className="text-sm font-medium text-[var(--texto)]">
            Conclusão em cascata registrada. Você tem 15s para desfazer se precisar.
          </p>
          <Botao
            type="button"
            variante="secundario"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            disabled={mutacaoDesfazer.isPending}
            onClick={() => mutacaoDesfazer.mutate(tokenDesfazer)}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Desfazer cascata</span>
          </Botao>
        </CartaoBento>
      ) : null}

      {proximaOcorrencia ? (
        <CartaoBento
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-l-[var(--sucesso)]"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--texto)]">
            <Repeat className="h-4 w-4 text-[var(--sucesso)]" aria-hidden="true" />
            Próxima ocorrência recorrente criada automaticamente.
          </span>
          <button
            type="button"
            onClick={() => setProximaOcorrencia(null)}
            className="cursor-pointer text-xs font-semibold text-[var(--texto-sec)] underline"
          >
            Dispensar
          </button>
        </CartaoBento>
      ) : null}

      {erroAcao ? (
        <CartaoBento role="alert" className="border-l-4 border-l-[var(--erro)]">
          <p className="text-sm font-semibold text-[var(--erro)]">{erroAcao}</p>
        </CartaoBento>
      ) : null}

      <FormularioNovaTarefa
        key={paiParaCriar ? paiParaCriar.id : 'raiz'}
        paiSelecionado={paiParaCriar}
        aoCancelarPai={() => setPaiParaCriar(null)}
        etiquetas={etiquetas}
        enviando={mutacaoCriar.isPending}
        aoCriar={async (entrada) => {
          await mutacaoCriar.mutateAsync(entrada);
        }}
        reduzirMovimento={reduzirMovimento}
      />

      <BarraFiltrosEEtiquetas
        filtros={filtros}
        aoMudarFiltros={setFiltros}
        etiquetas={etiquetas}
        limiteEtiquetas={limiteEtiquetas}
        aoCriarEtiqueta={async (entrada) => {
          await servico.criarEtiqueta(entrada);
          await queryClient.invalidateQueries({ queryKey: ['etiquetas'] });
        }}
        aoAtualizarEtiqueta={async (id, entrada) => {
          await servico.atualizarEtiqueta(id, entrada);
          await queryClient.invalidateQueries({ queryKey: ['etiquetas'] });
          await invalidarTarefas();
        }}
        aoExcluirEtiqueta={async (id) => {
          await servico.excluirEtiqueta(id);
          await queryClient.invalidateQueries({ queryKey: ['etiquetas'] });
          await invalidarTarefas();
        }}
        reduzirMovimento={reduzirMovimento}
      />

      {consultaTarefas.isLoading ? (
        <CartaoBento>
          <p className="text-sm text-[var(--texto-sec)]">Carregando sua Jornada do Dia...</p>
        </CartaoBento>
      ) : consultaTarefas.isError ? (
        <CartaoBento role="alert" className="space-y-2 border-l-4 border-l-[var(--erro)]">
          <p className="text-sm font-semibold text-[var(--erro)]">
            Não foi possível carregar suas tarefas no momento.
          </p>
          <Botao
            type="button"
            variante="secundario"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            onClick={() => {
              void consultaTarefas.refetch();
            }}
          >
            Tentar novamente
          </Botao>
        </CartaoBento>
      ) : raizes.length === 0 ? (
        <CartaoBento>
          <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
            Sua Jornada do Dia está livre
          </h2>
          <p className="mt-1 text-sm text-[var(--texto-sec)]">
            Nenhuma tarefa encontrada para os filtros atuais. Crie sua primeira meta acima para
            vê-la florescer no cenário.
          </p>
        </CartaoBento>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={lidarDragEnd}>
          <div className="space-y-5">
            {ORDEM_TURNOS.map((turno) => {
              const tarefasTurno = raizesPorTurno[turno];
              if (tarefasTurno.length === 0) {
                return null;
              }
              return (
                <CartaoBento key={turno} as="section" className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
                      Turno: {ROTULOS_TURNO[turno]}
                    </h2>
                    <span className="font-mono text-xs font-semibold text-[var(--texto-sec)]">
                      {tarefasTurno.length}{' '}
                      {tarefasTurno.length === 1 ? 'tarefa-raiz' : 'tarefas-raiz'}
                    </span>
                  </div>

                  <SortableContext
                    items={tarefasTurno.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {tarefasTurno.map((tarefa, indice) => (
                        <ItemTarefaArvore
                          key={tarefa.id}
                          tarefa={tarefa}
                          irmas={tarefasTurno}
                          indice={indice}
                          aoConcluir={(id) =>
                            mutacaoConcluir.mutate({ tarefaId: id, confirmarCascata: false })
                          }
                          aoReabrir={(id) => mutacaoReabrir.mutate(id)}
                          aoSelecionarPaiParaCriar={(pai) =>
                            setPaiParaCriar({
                              id: pai.id,
                              titulo: pai.titulo,
                              profundidade: pai.profundidade,
                              turno: pai.turno,
                            })
                          }
                          aoAbrirEdicao={(id) => setTarefaEmEdicaoId(id)}
                          aoExcluir={(id) => mutacaoExcluir.mutate({ tarefaId: id })}
                          aoReordenarIrmas={(tarefaPaiId, ordenacao) =>
                            mutacaoReordenar.mutate({ tarefaPaiId, ordenacao })
                          }
                          ocupado={ocupadoGeral}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CartaoBento>
              );
            })}
          </div>
        </DndContext>
      )}

      <Dialog.Root
        open={Boolean(confirmacaoCascata)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setConfirmacaoCascata(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs" />
          <Dialog.Content className="superficie-bento fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-2xl p-6 text-[var(--texto)] shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--secundaria)]" />
              <div>
                <Dialog.Title className="fonte-display text-lg font-bold">
                  Confirmar conclusão em cascata
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-[var(--texto-sec)]">
                  Esta tarefa possui {confirmacaoCascata?.descendentesEmAberto ?? 1} subtarefa(s) em
                  aberto. Deseja concluir toda a subárvore agora?
                </Dialog.Description>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Botao
                type="button"
                variante="fantasma"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                onClick={() => setConfirmacaoCascata(null)}
              >
                Cancelar
              </Botao>
              <Botao
                type="button"
                variante="primario"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                disabled={mutacaoConcluir.isPending}
                onClick={() => {
                  if (confirmacaoCascata) {
                    mutacaoConcluir.mutate({
                      tarefaId: confirmacaoCascata.tarefaId,
                      confirmarCascata: true,
                    });
                  }
                }}
              >
                Concluir tudo em cascata
              </Botao>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(confirmacaoExclusao)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setConfirmacaoExclusao(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs" />
          <Dialog.Content className="superficie-bento fixed top-1/2 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-2xl p-6 text-[var(--texto)] shadow-2xl">
            <div>
              <Dialog.Title className="fonte-display text-lg font-bold">
                Como excluir tarefa com subtarefas?
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--texto-sec)]">
                Esta tarefa contém {confirmacaoExclusao?.totalDescendentes ?? 1} subtarefa(s).
                Escolha entre promover as filhas diretas um nível acima ou excluir tudo em cascata.
              </Dialog.Description>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Botao
                type="button"
                variante="fantasma"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                onClick={() => setConfirmacaoExclusao(null)}
              >
                Cancelar
              </Botao>
              <Botao
                type="button"
                variante="secundario"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                disabled={mutacaoExcluir.isPending}
                onClick={() => {
                  if (confirmacaoExclusao) {
                    mutacaoExcluir.mutate({
                      tarefaId: confirmacaoExclusao.tarefaId,
                      estrategia: 'promover_filhas',
                    });
                  }
                }}
              >
                Promover filhas diretas
              </Botao>
              <Botao
                type="button"
                variante="perigo"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                disabled={mutacaoExcluir.isPending}
                onClick={() => {
                  if (confirmacaoExclusao) {
                    mutacaoExcluir.mutate({
                      tarefaId: confirmacaoExclusao.tarefaId,
                      estrategia: 'cascata',
                    });
                  }
                }}
              >
                Excluir tudo em cascata
              </Botao>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <GavetaEdicaoTarefa
        aberto={Boolean(tarefaEmEdicaoId)}
        detalhe={consultaDetalhe.data ?? null}
        carregando={consultaDetalhe.isLoading}
        arvoreCompleta={raizes}
        etiquetas={etiquetas}
        salvandoTarefa={mutacaoAtualizar.isPending}
        salvandoDetalhes={mutacaoSalvarDetalhes.isPending}
        movendo={mutacaoMover.isPending}
        aoFechar={() => setTarefaEmEdicaoId(null)}
        aoAtualizarTarefa={async (id, entrada) => {
          await mutacaoAtualizar.mutateAsync({ id, entrada });
        }}
        aoMoverTarefa={async (id, novoPaiId) => {
          await mutacaoMover.mutateAsync({ tarefaId: id, novoPaiId });
        }}
        aoSalvarDetalhes={async (id, entrada) => {
          await mutacaoSalvarDetalhes.mutateAsync({ tarefaId: id, entrada });
        }}
        reduzirMovimento={reduzirMovimento}
      />
    </div>
  );
}
