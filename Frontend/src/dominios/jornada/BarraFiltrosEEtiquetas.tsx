import { zodResolver } from '@hookform/resolvers/zod';
import { Download, FilterX, Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { InterruptorAcessivel } from '../../componentes/InterruptorAcessivel';
import { ModalAcessivel } from '../../componentes/ModalAcessivel';
import { construirUrlExportacaoTarefas } from '../../servicos/cliente-jornada';
import type {
  EtiquetaCompleta,
  FiltrosListagemTarefas,
  StatusTarefa,
  TurnoTarefa,
} from '../../servicos/tipos-jornada';
import type { PrioridadeTarefa } from '../../astronomia/tipos';
import {
  CORES_PADRAO_ETIQUETA,
  esquemaEtiqueta,
  ORDEM_TURNOS,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  ROTULOS_TURNO,
} from './logica-jornada';

export interface PropriedadesBarraFiltrosEEtiquetas {
  filtros: FiltrosListagemTarefas;
  aoMudarFiltros: (proximos: FiltrosListagemTarefas) => void;
  etiquetas: readonly EtiquetaCompleta[];
  limiteEtiquetas: number;
  aoCriarEtiqueta: (entrada: { nome: string; cor: string }) => Promise<void>;
  aoAtualizarEtiqueta: (id: string, entrada: { nome?: string; cor?: string }) => Promise<void>;
  aoExcluirEtiqueta: (id: string) => Promise<void>;
  reduzirMovimento: boolean;
}

interface CamposFormEtiqueta {
  nome: string;
  cor: string;
}

export function BarraFiltrosEEtiquetas({
  filtros,
  aoMudarFiltros,
  etiquetas,
  limiteEtiquetas,
  aoCriarEtiqueta,
  aoAtualizarEtiqueta,
  aoExcluirEtiqueta,
  reduzirMovimento,
}: PropriedadesBarraFiltrosEEtiquetas) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [corEdicao, setCorEdicao] = useState(CORES_PADRAO_ETIQUETA[0]);
  const [corSelecionada, setCorSelecionada] = useState<string>(CORES_PADRAO_ETIQUETA[0]);
  const [erroGestao, setErroGestao] = useState<string | null>(null);

  const formularioEtiqueta = useForm<CamposFormEtiqueta>({
    resolver: zodResolver(esquemaEtiqueta),
    defaultValues: {
      nome: '',
      cor: CORES_PADRAO_ETIQUETA[0],
    },
  });

  const atualizarCorFormulario = (novaCor: string) => {
    setCorSelecionada(novaCor);
    formularioEtiqueta.setValue('cor', novaCor, { shouldValidate: true });
  };

  const lidarCriarEtiqueta = formularioEtiqueta.handleSubmit(async (valores) => {
    setErroGestao(null);
    try {
      await aoCriarEtiqueta({
        nome: valores.nome,
        cor: valores.cor.toUpperCase(),
      });
      setCorSelecionada(CORES_PADRAO_ETIQUETA[0]);
      formularioEtiqueta.reset({ nome: '', cor: CORES_PADRAO_ETIQUETA[0] });
    } catch (erro) {
      setErroGestao(erro instanceof Error ? erro.message : 'Não foi possível criar a etiqueta.');
    }
  });

  const lidarSalvarEdicao = async (id: string) => {
    const validacao = esquemaEtiqueta.safeParse({ nome: nomeEdicao, cor: corEdicao });
    if (!validacao.success) {
      setErroGestao(validacao.error.issues[0]?.message ?? 'Dados de etiqueta inválidos.');
      return;
    }
    setErroGestao(null);
    try {
      await aoAtualizarEtiqueta(id, {
        nome: validacao.data.nome,
        cor: validacao.data.cor.toUpperCase(),
      });
      setEditandoId(null);
    } catch (erro) {
      setErroGestao(
        erro instanceof Error ? erro.message : 'Não foi possível atualizar a etiqueta.',
      );
    }
  };

  const haFiltrosAtivos = Boolean(
    filtros.busca ||
    filtros.turno ||
    filtros.prioridade ||
    filtros.status ||
    filtros.etiquetaId ||
    filtros.incluirConcluidas === false,
  );

  return (
    <CartaoBento className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--primaria)]" aria-hidden="true" />
          <h2 className="fonte-display text-base font-bold text-[var(--texto)]">
            Filtros, etiquetas e exportação
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={construirUrlExportacaoTarefas('md')}
            download="lume-tarefas.md"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--texto)]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Exportar .md</span>
          </a>

          <a
            href={construirUrlExportacaoTarefas('json')}
            download="lume-tarefas.json"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--texto)]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Exportar .json</span>
          </a>

          <ModalAcessivel
            aberto={modalAberto}
            aoMudarAbertura={setModalAberto}
            titulo="Gerenciar etiquetas"
            descricao={`Crie até ${limiteEtiquetas} etiquetas coloridas para organizar seus turnos e metas. (${etiquetas.length} / ${limiteEtiquetas})`}
            gatilho={
              <Botao
                variante="secundario"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                type="button"
              >
                <Tag className="h-4 w-4" aria-hidden="true" />
                <span>Gerenciar etiquetas</span>
              </Botao>
            }
          >
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  void lidarCriarEtiqueta(e);
                }}
                className="space-y-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3"
              >
                <div className="space-y-1">
                  <label
                    htmlFor="nova-etiqueta-nome"
                    className="block text-xs font-semibold text-[var(--texto)]"
                  >
                    Nome da nova etiqueta
                  </label>
                  <input
                    id="nova-etiqueta-nome"
                    type="text"
                    maxLength={30}
                    placeholder="Ex.: Faculdade, Saúde, Web II"
                    {...formularioEtiqueta.register('nome')}
                    className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
                  />
                  {formularioEtiqueta.formState.errors.nome ? (
                    <p role="alert" className="text-xs font-medium text-[var(--erro)]">
                      {formularioEtiqueta.formState.errors.nome.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5" aria-label="Paleta de cores">
                    {CORES_PADRAO_ETIQUETA.map((corHex) => (
                      <button
                        key={corHex}
                        type="button"
                        aria-label={`Selecionar cor ${corHex}`}
                        onClick={() => atualizarCorFormulario(corHex)}
                        className={`h-7 w-7 cursor-pointer rounded-full border-2 ${
                          corSelecionada.toUpperCase() === corHex
                            ? 'border-[var(--texto)] scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: corHex }}
                      />
                    ))}
                    <input
                      aria-label="Cor personalizada da etiqueta"
                      type="color"
                      value={corSelecionada}
                      onChange={(e) => atualizarCorFormulario(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-[var(--borda)] bg-transparent p-0.5"
                    />
                  </div>

                  <Botao
                    type="submit"
                    variante="primario"
                    tamanho="sm"
                    reduzirMovimento={reduzirMovimento}
                    disabled={etiquetas.length >= limiteEtiquetas}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Criar etiqueta</span>
                  </Botao>
                </div>
              </form>

              {erroGestao ? (
                <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
                  {erroGestao}
                </p>
              ) : null}

              <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {etiquetas.length === 0 ? (
                  <li className="text-sm text-[var(--texto-sec)]">
                    Nenhuma etiqueta cadastrada ainda.
                  </li>
                ) : (
                  etiquetas.map((etq) => (
                    <li
                      key={etq.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2"
                    >
                      {editandoId === etq.id ? (
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <input
                            aria-label={`Editar nome de ${etq.nome}`}
                            type="text"
                            maxLength={30}
                            value={nomeEdicao}
                            onChange={(e) => setNomeEdicao(e.target.value)}
                            className="min-h-9 flex-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2 text-sm text-[var(--texto)]"
                          />
                          <input
                            aria-label={`Editar cor de ${etq.nome}`}
                            type="color"
                            value={corEdicao}
                            onChange={(e) => setCorEdicao(e.target.value)}
                            className="h-9 w-10 cursor-pointer rounded border border-[var(--borda)]"
                          />
                          <Botao
                            type="button"
                            variante="primario"
                            tamanho="sm"
                            reduzirMovimento={reduzirMovimento}
                            onClick={() => {
                              void lidarSalvarEdicao(etq.id);
                            }}
                          >
                            Salvar
                          </Botao>
                          <Botao
                            type="button"
                            variante="fantasma"
                            tamanho="sm"
                            reduzirMovimento={reduzirMovimento}
                            onClick={() => setEditandoId(null)}
                          >
                            Cancelar
                          </Botao>
                        </div>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--texto)]">
                            <span
                              className="h-3.5 w-3.5 rounded-full"
                              style={{ backgroundColor: etq.cor }}
                              aria-hidden="true"
                            />
                            {etq.nome}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Editar etiqueta ${etq.nome}`}
                              onClick={() => {
                                setEditandoId(etq.id);
                                setNomeEdicao(etq.nome);
                                setCorEdicao(etq.cor);
                              }}
                              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] text-[var(--texto)]"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir etiqueta ${etq.nome}`}
                              onClick={() => {
                                void aoExcluirEtiqueta(etq.id);
                              }}
                              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] text-[var(--erro)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </ModalAcessivel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label
            htmlFor="filtro-busca-tarefas"
            className="mb-1 block text-xs font-semibold text-[var(--texto-sec)]"
          >
            Buscar tarefas
          </label>
          <input
            id="filtro-busca-tarefas"
            aria-label="Buscar tarefas"
            type="search"
            value={filtros.busca ?? ''}
            onChange={(e) => aoMudarFiltros({ ...filtros, busca: e.target.value || undefined })}
            placeholder="Filtrar por título..."
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
          />
        </div>

        <div>
          <label
            htmlFor="filtro-turno-tarefas"
            className="mb-1 block text-xs font-semibold text-[var(--texto-sec)]"
          >
            Turno
          </label>
          <select
            id="filtro-turno-tarefas"
            aria-label="Filtrar por turno"
            value={filtros.turno ?? ''}
            onChange={(e) =>
              aoMudarFiltros({
                ...filtros,
                turno: (e.target.value || undefined) as TurnoTarefa | undefined,
              })
            }
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
          >
            <option value="">Todos os turnos</option>
            {ORDEM_TURNOS.map((turno) => (
              <option key={turno} value={turno}>
                {ROTULOS_TURNO[turno]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filtro-prioridade-tarefas"
            className="mb-1 block text-xs font-semibold text-[var(--texto-sec)]"
          >
            Prioridade
          </label>
          <select
            id="filtro-prioridade-tarefas"
            aria-label="Filtrar por prioridade"
            value={filtros.prioridade ?? ''}
            onChange={(e) =>
              aoMudarFiltros({
                ...filtros,
                prioridade: (e.target.value || undefined) as PrioridadeTarefa | undefined,
              })
            }
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
          >
            <option value="">Todas prioridades</option>
            {(Object.keys(ROTULOS_PRIORIDADE) as PrioridadeTarefa[]).map((prio) => (
              <option key={prio} value={prio}>
                {ROTULOS_PRIORIDADE[prio]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filtro-etiqueta-tarefas"
            className="mb-1 block text-xs font-semibold text-[var(--texto-sec)]"
          >
            Etiqueta
          </label>
          <select
            id="filtro-etiqueta-tarefas"
            aria-label="Filtrar por etiqueta"
            value={filtros.etiquetaId ?? ''}
            onChange={(e) =>
              aoMudarFiltros({
                ...filtros,
                etiquetaId: e.target.value || undefined,
              })
            }
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
          >
            <option value="">Todas etiquetas</option>
            {etiquetas.map((etq) => (
              <option key={etq.id} value={etq.id}>
                {etq.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="filtro-status-tarefas"
              className="text-xs font-semibold text-[var(--texto-sec)]"
            >
              Status
            </label>
            <select
              id="filtro-status-tarefas"
              aria-label="Filtrar por status"
              value={filtros.status ?? ''}
              onChange={(e) =>
                aoMudarFiltros({
                  ...filtros,
                  status: (e.target.value || undefined) as StatusTarefa | undefined,
                })
              }
              className="min-h-9 rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 text-xs text-[var(--texto)]"
            >
              <option value="">Todos</option>
              {(Object.keys(ROTULOS_STATUS) as StatusTarefa[]).map((st) => (
                <option key={st} value={st}>
                  {ROTULOS_STATUS[st]}
                </option>
              ))}
            </select>
          </div>

          <InterruptorAcessivel
            id="filtro-incluir-concluidas"
            rotulo="Incluir concluídas"
            ativado={filtros.incluirConcluidas ?? true}
            aoAlternar={(incluir) => aoMudarFiltros({ ...filtros, incluirConcluidas: incluir })}
          />
        </div>

        <Botao
          type="button"
          variante="fantasma"
          tamanho="sm"
          reduzirMovimento={reduzirMovimento}
          disabled={!haFiltrosAtivos}
          onClick={() => aoMudarFiltros({ incluirConcluidas: true })}
        >
          <FilterX className="h-4 w-4" aria-hidden="true" />
          <span>Limpar filtros</span>
        </Botao>
      </div>
    </CartaoBento>
  );
}
