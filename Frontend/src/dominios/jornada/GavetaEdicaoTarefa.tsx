import * as Dialog from '@radix-ui/react-dialog';
import { Bell, FolderTree, Save, X } from 'lucide-react';
import { useState } from 'react';
import type { PrioridadeTarefa } from '../../astronomia/tipos';
import { Botao } from '../../componentes/Botao';
import type {
  BlocoNota,
  ConfiguracaoRecorrencia,
  DetalheTarefaCompleta,
  EntradaAtualizarTarefa,
  EtiquetaCompleta,
  MetadadosVisuaisTarefa,
  StatusTarefa,
  TarefaArvore,
  TipoRecorrencia,
  TurnoTarefa,
} from '../../servicos/tipos-jornada';
import { EditorNotasBlocos } from './EditorNotasBlocos';
import {
  calcularHorarioLembrete,
  converterInputLocalParaIso,
  converterIsoParaInputLocal,
  DIAS_SEMANA_LUME,
  formatarPrazoCurto,
  listarPaisValidosParaMover,
  MAX_ETIQUETAS_POR_TAREFA,
  OPCOES_ANTECEDENCIA_LEMBRETE,
  ORDEM_TURNOS,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  ROTULOS_TURNO,
  validarRecorrenciaLocal,
} from './logica-jornada';

export interface PropriedadesGavetaEdicaoTarefa {
  aberto: boolean;
  detalhe: DetalheTarefaCompleta | null;
  carregando: boolean;
  arvoreCompleta: readonly TarefaArvore[];
  etiquetas: readonly EtiquetaCompleta[];
  salvandoTarefa: boolean;
  salvandoDetalhes: boolean;
  movendo: boolean;
  aoFechar: () => void;
  aoAtualizarTarefa: (tarefaId: string, entrada: EntradaAtualizarTarefa) => Promise<void>;
  aoMoverTarefa: (tarefaId: string, novoPaiId: string | null) => Promise<void>;
  aoSalvarDetalhes: (
    tarefaId: string,
    entrada: { metadadosVisuais: MetadadosVisuaisTarefa; notasEmBlocos: BlocoNota[] },
  ) => Promise<void>;
  reduzirMovimento: boolean;
}

interface ConteudoGavetaProps {
  detalhe: DetalheTarefaCompleta;
  arvoreCompleta: readonly TarefaArvore[];
  etiquetas: readonly EtiquetaCompleta[];
  salvandoTarefa: boolean;
  salvandoDetalhes: boolean;
  movendo: boolean;
  aoAtualizarTarefa: (tarefaId: string, entrada: EntradaAtualizarTarefa) => Promise<void>;
  aoMoverTarefa: (tarefaId: string, novoPaiId: string | null) => Promise<void>;
  aoSalvarDetalhes: (
    tarefaId: string,
    entrada: { metadadosVisuais: MetadadosVisuaisTarefa; notasEmBlocos: BlocoNota[] },
  ) => Promise<void>;
  reduzirMovimento: boolean;
}

function lerRascunhoLembrete(tarefaId: string): string {
  try {
    if (typeof localStorage === 'undefined') {
      return '';
    }
    return localStorage.getItem(`lume_lembrete_rascunho_${tarefaId}`) ?? '';
  } catch {
    return '';
  }
}

function gravarRascunhoLembrete(tarefaId: string, valor: string): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (!valor) {
      localStorage.removeItem(`lume_lembrete_rascunho_${tarefaId}`);
      return;
    }
    localStorage.setItem(`lume_lembrete_rascunho_${tarefaId}`, valor);
  } catch {
    // Armazenamento local indisponivel no navegador.
  }
}

function ConteudoGavetaEdicao({
  detalhe,
  arvoreCompleta,
  etiquetas,
  salvandoTarefa,
  salvandoDetalhes,
  movendo,
  aoAtualizarTarefa,
  aoMoverTarefa,
  aoSalvarDetalhes,
  reduzirMovimento,
}: ConteudoGavetaProps) {
  const { tarefa, detalhes, lembretes } = detalhe;

  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [status, setStatus] = useState<StatusTarefa>(tarefa.status);
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>(tarefa.prioridade);
  const [turno, setTurno] = useState<TurnoTarefa>(tarefa.turno);
  const [prazoLocal, setPrazoLocal] = useState(() => converterIsoParaInputLocal(tarefa.prazo));
  const [tipoRecorrencia, setTipoRecorrencia] = useState<TipoRecorrencia>(tarefa.recorrencia.tipo);
  const [diasSemana, setDiasSemana] = useState<number[]>(() => [...tarefa.recorrencia.diasSemana]);
  const [intervalo, setIntervalo] = useState<number>(tarefa.recorrencia.intervalo);
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<string[]>(() =>
    tarefa.etiquetas.map((e) => e.id),
  );
  const [paiDestino, setPaiDestino] = useState<string>(tarefa.tarefaPaiId ?? '__raiz__');
  const [antecedenciaLembrete, setAntecedenciaLembrete] = useState<string>(() =>
    lerRascunhoLembrete(tarefa.id),
  );
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);

  const paisValidos = listarPaisValidosParaMover(arvoreCompleta, tarefa.id);

  const alternarDiaSemana = (valorDia: number) => {
    setDiasSemana((atual) =>
      atual.includes(valorDia)
        ? atual.filter((item) => item !== valorDia)
        : [...atual, valorDia].sort((a, b) => a - b),
    );
  };

  const alternarEtiqueta = (id: string) => {
    setEtiquetasSelecionadas((atual) => {
      if (atual.includes(id)) {
        return atual.filter((item) => item !== id);
      }
      if (atual.length >= MAX_ETIQUETAS_POR_TAREFA) {
        setErroEdicao(`Cada tarefa aceita no máximo ${MAX_ETIQUETAS_POR_TAREFA} etiquetas.`);
        return atual;
      }
      setErroEdicao(null);
      return [...atual, id];
    });
  };

  const lidarSalvarCampos = async () => {
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo || tituloLimpo.length > 160) {
      setErroEdicao('O título deve ter entre 1 e 160 caracteres.');
      return;
    }

    const recorrencia: ConfiguracaoRecorrencia = {
      tipo: tipoRecorrencia,
      diasSemana: tipoRecorrencia === 'semanal' ? diasSemana : [],
      diaMes: tipoRecorrencia === 'mensal' ? tarefa.recorrencia.diaMes : null,
      intervalo: tipoRecorrencia === 'nenhuma' ? 1 : intervalo,
    };

    const validacaoRec = validarRecorrenciaLocal(recorrencia);
    if (!validacaoRec.valida) {
      setErroEdicao(validacaoRec.mensagem);
      return;
    }

    setErroEdicao(null);
    setMensagemStatus(null);
    try {
      await aoAtualizarTarefa(tarefa.id, {
        titulo: tituloLimpo,
        status,
        prioridade,
        turno,
        prazo: converterInputLocalParaIso(prazoLocal),
        recorrencia,
        etiquetaIds: etiquetasSelecionadas,
      });
      setMensagemStatus('Dados da tarefa atualizados.');
    } catch (erro) {
      setErroEdicao(erro instanceof Error ? erro.message : 'Falha ao atualizar a tarefa.');
    }
  };

  const lidarMover = async () => {
    setErroEdicao(null);
    setMensagemStatus(null);
    try {
      const novoPaiId = paiDestino === '__raiz__' ? null : paiDestino;
      await aoMoverTarefa(tarefa.id, novoPaiId);
      setMensagemStatus('Posição na árvore atualizada.');
    } catch (erro) {
      setErroEdicao(erro instanceof Error ? erro.message : 'Não foi possível mover a tarefa.');
    }
  };

  const lidarMudarLembrete = (valor: string) => {
    setAntecedenciaLembrete(valor);
    gravarRascunhoLembrete(tarefa.id, valor);
  };

  const prazoParaLembrete = converterInputLocalParaIso(prazoLocal) ?? tarefa.prazo;
  const horarioPrevisto =
    antecedenciaLembrete && prazoParaLembrete
      ? calcularHorarioLembrete(prazoParaLembrete, Number(antecedenciaLembrete))
      : null;

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
        <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
          Dados e recorrência
        </h3>

        <div className="space-y-1">
          <label
            htmlFor="edicao-titulo-tarefa"
            className="block text-xs font-semibold text-[var(--texto-sec)]"
          >
            Título
          </label>
          <input
            id="edicao-titulo-tarefa"
            type="text"
            maxLength={160}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="edicao-status-tarefa"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Status
            </label>
            <select
              id="edicao-status-tarefa"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusTarefa)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
            >
              {(Object.keys(ROTULOS_STATUS) as StatusTarefa[]).map((st) => (
                <option key={st} value={st}>
                  {ROTULOS_STATUS[st]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="edicao-prioridade-tarefa"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Prioridade
            </label>
            <select
              id="edicao-prioridade-tarefa"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as PrioridadeTarefa)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
            >
              {(Object.keys(ROTULOS_PRIORIDADE) as PrioridadeTarefa[]).map((prio) => (
                <option key={prio} value={prio}>
                  {ROTULOS_PRIORIDADE[prio]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="edicao-turno-tarefa"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Turno
            </label>
            <select
              id="edicao-turno-tarefa"
              value={turno}
              onChange={(e) => setTurno(e.target.value as TurnoTarefa)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
            >
              {ORDEM_TURNOS.map((itemTurno) => (
                <option key={itemTurno} value={itemTurno}>
                  {ROTULOS_TURNO[itemTurno]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="edicao-prazo-tarefa"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Prazo
            </label>
            <input
              id="edicao-prazo-tarefa"
              type="datetime-local"
              value={prazoLocal}
              onChange={(e) => setPrazoLocal(e.target.value)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="edicao-recorrencia-tarefa"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Recorrência periódica
            </label>
            <select
              id="edicao-recorrencia-tarefa"
              value={tipoRecorrencia}
              onChange={(e) => setTipoRecorrencia(e.target.value as TipoRecorrencia)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
            >
              <option value="nenhuma">Sem recorrência</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>

          {tipoRecorrencia !== 'nenhuma' ? (
            <div className="space-y-1">
              <label
                htmlFor="edicao-intervalo-recorrencia"
                className="block text-xs font-semibold text-[var(--texto-sec)]"
              >
                Intervalo
              </label>
              <input
                id="edicao-intervalo-recorrencia"
                type="number"
                min={1}
                max={365}
                value={intervalo}
                onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))}
                className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
              />
            </div>
          ) : null}
        </div>

        {tipoRecorrencia === 'semanal' ? (
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA_LUME.map((dia) => {
              const ativo = diasSemana.includes(dia.valor);
              return (
                <button
                  key={dia.valor}
                  type="button"
                  onClick={() => alternarDiaSemana(dia.valor)}
                  className={`min-h-8 cursor-pointer rounded-lg border px-2 text-xs font-semibold ${
                    ativo
                      ? 'border-[var(--primaria)] bg-[var(--primaria)] text-[var(--primaria-texto)]'
                      : 'border-[var(--borda)] bg-[var(--superficie-solida)] text-[var(--texto)]'
                  }`}
                >
                  {dia.rotulo}
                </button>
              );
            })}
          </div>
        ) : null}

        {etiquetas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {etiquetas.map((etq) => {
              const marcada = etiquetasSelecionadas.includes(etq.id);
              return (
                <button
                  key={etq.id}
                  type="button"
                  onClick={() => alternarEtiqueta(etq.id)}
                  className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${
                    marcada
                      ? 'border-[var(--texto)] bg-[var(--superficie-solida)] text-[var(--texto)]'
                      : 'border-[var(--borda)] bg-[var(--superficie-solida)] text-[var(--texto-sec)] opacity-75'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: etq.cor }}
                    aria-hidden="true"
                  />
                  <span>{etq.nome}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Botao
            type="button"
            variante="primario"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            disabled={salvandoTarefa}
            onClick={() => {
              void lidarSalvarCampos();
            }}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{salvandoTarefa ? 'Salvando...' : 'Salvar tarefa'}</span>
          </Botao>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-[var(--primaria)]" aria-hidden="true" />
          <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
            Mover na hierarquia (até 5 níveis)
          </h3>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label
              htmlFor="mover-pai-seletor"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Mover para dentro de
            </label>
            <select
              id="mover-pai-seletor"
              aria-label="Mover para dentro de"
              value={paiDestino}
              onChange={(e) => setPaiDestino(e.target.value)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
            >
              <option value="__raiz__">Promover para tarefa-raiz (nível 1)</option>
              {paisValidos.map((candidato) => (
                <option key={candidato.id} value={candidato.id}>
                  {`${'· '.repeat(Math.max(0, candidato.profundidade - 1))}${candidato.titulo} (N${candidato.profundidade})`}
                </option>
              ))}
            </select>
          </div>

          <Botao
            type="button"
            variante="secundario"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            disabled={movendo}
            onClick={() => {
              void lidarMover();
            }}
          >
            <span>{movendo ? 'Movendo...' : 'Aplicar movimentação'}</span>
          </Botao>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--secundaria)]" aria-hidden="true" />
          <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
            Lembrete desta tarefa
          </h3>
        </div>

        {lembretes.length > 0 ? (
          <ul className="space-y-1 text-xs text-[var(--texto)]">
            {lembretes.map((lem) => (
              <li key={lem.id}>
                Lembrete ativo: {lem.antecedenciaMin} min antes (status: {lem.status})
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-1">
          <label
            htmlFor="seletor-antecedencia-lembrete"
            className="block text-xs font-semibold text-[var(--texto-sec)]"
          >
            Antecedência do lembrete
          </label>
          <select
            id="seletor-antecedencia-lembrete"
            aria-label="Antecedência do lembrete"
            value={antecedenciaLembrete}
            onChange={(e) => lidarMudarLembrete(e.target.value)}
            className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 text-sm text-[var(--texto)]"
          >
            <option value="">Sem lembrete configurado</option>
            {OPCOES_ANTECEDENCIA_LEMBRETE.map((op) => (
              <option key={op.minutos} value={String(op.minutos)}>
                {op.rotulo}
              </option>
            ))}
          </select>
        </div>

        {horarioPrevisto ? (
          <p className="font-mono text-xs font-semibold text-[var(--primaria)]">
            Previsão do aviso: {formatarPrazoCurto(horarioPrevisto.toISOString())} (envio Web Push
            conectado na Fase 24)
          </p>
        ) : (
          <p className="text-xs text-[var(--texto-sec)]">
            Defina um prazo acima para calcular o horário exato do aviso Web Push (ativado na Fase
            24).
          </p>
        )}
      </section>

      {erroEdicao ? (
        <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
          {erroEdicao}
        </p>
      ) : null}

      {mensagemStatus ? (
        <p role="status" className="text-xs font-semibold text-[var(--sucesso)]">
          {mensagemStatus}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
        <EditorNotasBlocos
          key={tarefa.id}
          blocosIniciais={detalhes.notasEmBlocos}
          metadadosIniciais={detalhes.metadadosVisuais}
          salvando={salvandoDetalhes}
          aoSalvar={(entrada) => aoSalvarDetalhes(tarefa.id, entrada)}
          reduzirMovimento={reduzirMovimento}
        />
      </section>
    </div>
  );
}

export function GavetaEdicaoTarefa({
  aberto,
  detalhe,
  carregando,
  arvoreCompleta,
  etiquetas,
  salvandoTarefa,
  salvandoDetalhes,
  movendo,
  aoFechar,
  aoAtualizarTarefa,
  aoMoverTarefa,
  aoSalvarDetalhes,
  reduzirMovimento,
}: PropriedadesGavetaEdicaoTarefa) {
  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(estado) => {
        if (!estado) {
          aoFechar();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs" />
        <Dialog.Content className="superficie-bento fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl overflow-y-auto p-6 text-[var(--texto)] shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--borda)] pb-4">
            <div>
              <Dialog.Title className="fonte-display text-xl font-bold text-[var(--texto)]">
                {detalhe ? `Editar tarefa: ${detalhe.tarefa.titulo}` : 'Carregando tarefa...'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[var(--texto-sec)]">
                Ajuste atributos, posição na árvore, lembrete e notas ricas em 6 blocos.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar gaveta de edição"
              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="mt-5">
            {carregando || !detalhe ? (
              <p className="text-sm text-[var(--texto-sec)]">Buscando detalhes da tarefa...</p>
            ) : (
              <ConteudoGavetaEdicao
                key={detalhe.tarefa.id}
                detalhe={detalhe}
                arvoreCompleta={arvoreCompleta}
                etiquetas={etiquetas}
                salvandoTarefa={salvandoTarefa}
                salvandoDetalhes={salvandoDetalhes}
                movendo={movendo}
                aoAtualizarTarefa={aoAtualizarTarefa}
                aoMoverTarefa={aoMoverTarefa}
                aoSalvarDetalhes={aoSalvarDetalhes}
                reduzirMovimento={reduzirMovimento}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
