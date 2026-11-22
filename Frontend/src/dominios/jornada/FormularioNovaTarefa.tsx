import { zodResolver } from '@hookform/resolvers/zod';
import { CornerDownRight, Plus, Repeat, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { PrioridadeTarefa } from '../../astronomia/tipos';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import type {
  ConfiguracaoRecorrencia,
  EntradaCriarTarefa,
  EtiquetaCompleta,
  TipoRecorrencia,
  TurnoTarefa,
} from '../../servicos/tipos-jornada';
import {
  converterInputLocalParaIso,
  DIAS_SEMANA_LUME,
  esquemaNovaTarefa,
  MAX_ETIQUETAS_POR_TAREFA,
  ORDEM_TURNOS,
  ROTULOS_PRIORIDADE,
  ROTULOS_TURNO,
  validarRecorrenciaLocal,
} from './logica-jornada';

export interface PaiSelecionadoCriacao {
  id: string;
  titulo: string;
  profundidade: number;
  turno: TurnoTarefa;
}

export interface PropriedadesFormularioNovaTarefa {
  paiSelecionado: PaiSelecionadoCriacao | null;
  aoCancelarPai: () => void;
  etiquetas: readonly EtiquetaCompleta[];
  enviando: boolean;
  aoCriar: (entrada: EntradaCriarTarefa) => Promise<void>;
  reduzirMovimento: boolean;
}

interface CamposNovaTarefaForm {
  titulo: string;
  prioridade: PrioridadeTarefa;
  turno: TurnoTarefa;
}

export function FormularioNovaTarefa({
  paiSelecionado,
  aoCancelarPai,
  etiquetas,
  enviando,
  aoCriar,
  reduzirMovimento,
}: PropriedadesFormularioNovaTarefa) {
  const [prazoLocal, setPrazoLocal] = useState('');
  const [tipoRecorrencia, setTipoRecorrencia] = useState<TipoRecorrencia>('nenhuma');
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [diaMes, setDiaMes] = useState<string>('');
  const [intervalo, setIntervalo] = useState<number>(1);
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<string[]>([]);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const formulario = useForm<CamposNovaTarefaForm>({
    resolver: zodResolver(esquemaNovaTarefa),
    defaultValues: {
      titulo: '',
      prioridade: 'media',
      turno: paiSelecionado?.turno ?? 'manha',
    },
  });

  const alternarDia = (valorDia: number) => {
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
        setErroFormulario(
          `Cada tarefa aceita no máximo ${MAX_ETIQUETAS_POR_TAREFA} etiquetas associadas.`,
        );
        return atual;
      }
      setErroFormulario(null);
      return [...atual, id];
    });
  };

  const lidarEnvio = formulario.handleSubmit(async (valores) => {
    const diaMesNumero =
      tipoRecorrencia === 'mensal' && diaMes.trim() ? Number(diaMes.trim()) : null;
    const recorrencia: ConfiguracaoRecorrencia = {
      tipo: tipoRecorrencia,
      diasSemana: tipoRecorrencia === 'semanal' ? diasSemana : [],
      diaMes: diaMesNumero,
      intervalo: tipoRecorrencia === 'nenhuma' ? 1 : intervalo,
    };

    const validacaoRec = validarRecorrenciaLocal(recorrencia);
    if (!validacaoRec.valida) {
      setErroFormulario(validacaoRec.mensagem);
      return;
    }

    setErroFormulario(null);
    try {
      await aoCriar({
        titulo: valores.titulo,
        tarefaPaiId: paiSelecionado?.id ?? null,
        prioridade: valores.prioridade,
        turno: paiSelecionado ? paiSelecionado.turno : valores.turno,
        prazo: converterInputLocalParaIso(prazoLocal),
        recorrencia,
        etiquetaIds: etiquetasSelecionadas,
      });
      formulario.reset({
        titulo: '',
        prioridade: 'media',
        turno: paiSelecionado?.turno ?? valores.turno,
      });
      setPrazoLocal('');
      setTipoRecorrencia('nenhuma');
      setDiasSemana([]);
      setDiaMes('');
      setIntervalo(1);
      setEtiquetasSelecionadas([]);
      if (paiSelecionado) {
        aoCancelarPai();
      }
    } catch (erro) {
      setErroFormulario(
        erro instanceof Error ? erro.message : 'Não foi possível criar a tarefa agora.',
      );
    }
  });

  return (
    <CartaoBento destacado className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
          Nova tarefa ou rotina recorrente
        </h2>
        {paiSelecionado ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primaria)] bg-[var(--superficie-alt)] px-3 py-1 text-xs font-semibold text-[var(--primaria)]">
            <CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Subtarefa de: {paiSelecionado.titulo} (nível {paiSelecionado.profundidade + 1}/5)
            </span>
            <button
              type="button"
              onClick={aoCancelarPai}
              aria-label="Cancelar criação de subtarefa"
              className="cursor-pointer rounded-full p-0.5 hover:opacity-75"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          void lidarEnvio(e);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="space-y-1 md:col-span-6">
            <label
              htmlFor="nova-tarefa-titulo"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Título da nova tarefa
            </label>
            <input
              id="nova-tarefa-titulo"
              aria-label="Título da nova tarefa"
              type="text"
              maxLength={160}
              placeholder="Ex.: Revisar roteiro de Web II"
              {...formulario.register('titulo')}
              className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-2 text-sm text-[var(--texto)]"
            />
            {formulario.formState.errors.titulo ? (
              <p role="alert" className="text-xs font-medium text-[var(--erro)]">
                {formulario.formState.errors.titulo.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1 md:col-span-3">
            <label
              htmlFor="nova-tarefa-prioridade"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Prioridade
            </label>
            <select
              id="nova-tarefa-prioridade"
              aria-label="Prioridade da nova tarefa"
              {...formulario.register('prioridade')}
              className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-2 text-sm text-[var(--texto)]"
            >
              {(Object.keys(ROTULOS_PRIORIDADE) as PrioridadeTarefa[]).map((prio) => (
                <option key={prio} value={prio}>
                  {ROTULOS_PRIORIDADE[prio]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-3">
            <label
              htmlFor="nova-tarefa-turno"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Turno do dia
            </label>
            <select
              id="nova-tarefa-turno"
              aria-label="Turno da nova tarefa"
              disabled={Boolean(paiSelecionado)}
              {...formulario.register('turno')}
              className="min-h-11 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-2 text-sm text-[var(--texto)] disabled:opacity-60"
            >
              {ORDEM_TURNOS.map((turno) => (
                <option key={turno} value={turno}>
                  {ROTULOS_TURNO[turno]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="space-y-1 md:col-span-4">
            <label
              htmlFor="nova-tarefa-prazo"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Prazo (opcional)
            </label>
            <input
              id="nova-tarefa-prazo"
              aria-label="Prazo da nova tarefa"
              type="datetime-local"
              value={prazoLocal}
              onChange={(e) => setPrazoLocal(e.target.value)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
            />
          </div>

          <div className="space-y-1 md:col-span-4">
            <label
              htmlFor="nova-tarefa-recorrencia"
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--texto-sec)]"
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Recorrência</span>
            </label>
            <select
              id="nova-tarefa-recorrencia"
              aria-label="Recorrência"
              value={tipoRecorrencia}
              onChange={(e) => setTipoRecorrencia(e.target.value as TipoRecorrencia)}
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
            >
              <option value="nenhuma">Sem recorrência</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>

          {tipoRecorrencia !== 'nenhuma' ? (
            <div className="space-y-1 md:col-span-4">
              <label
                htmlFor="nova-tarefa-intervalo"
                className="block text-xs font-semibold text-[var(--texto-sec)]"
              >
                Intervalo
              </label>
              <input
                id="nova-tarefa-intervalo"
                aria-label="Intervalo de recorrência"
                type="number"
                min={1}
                max={365}
                value={intervalo}
                onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))}
                className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
              />
            </div>
          ) : null}
        </div>

        {tipoRecorrencia === 'semanal' ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--texto-sec)]">Dias da semana</p>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA_LUME.map((dia) => {
                const marcado = diasSemana.includes(dia.valor);
                return (
                  <button
                    key={dia.valor}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => alternarDia(dia.valor)}
                    className={`min-h-9 cursor-pointer rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                      marcado
                        ? 'border-[var(--primaria)] bg-[var(--primaria)] text-[var(--primaria-texto)]'
                        : 'border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]'
                    }`}
                  >
                    {dia.rotulo}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {tipoRecorrencia === 'mensal' ? (
          <div className="max-w-xs space-y-1">
            <label
              htmlFor="nova-tarefa-dia-mes"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Dia do mês (1 a 31, opcional)
            </label>
            <input
              id="nova-tarefa-dia-mes"
              type="number"
              min={1}
              max={31}
              value={diaMes}
              onChange={(e) => setDiaMes(e.target.value)}
              placeholder="Usa o dia do prazo se vazio"
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
            />
          </div>
        ) : null}

        {etiquetas.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--texto-sec)]">
              Etiquetas (até {MAX_ETIQUETAS_POR_TAREFA})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {etiquetas.map((etq) => {
                const selecionada = etiquetasSelecionadas.includes(etq.id);
                return (
                  <button
                    key={etq.id}
                    type="button"
                    aria-pressed={selecionada}
                    onClick={() => alternarEtiqueta(etq.id)}
                    className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${
                      selecionada
                        ? 'border-[var(--texto)] bg-[var(--superficie-solida)] text-[var(--texto)] shadow-xs'
                        : 'border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto-sec)]'
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
          </div>
        ) : null}

        {erroFormulario ? (
          <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
            {erroFormulario}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Botao
            type="submit"
            variante="primario"
            reduzirMovimento={reduzirMovimento}
            disabled={enviando}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{enviando ? 'Salvando...' : 'Adicionar tarefa'}</span>
          </Botao>
        </div>
      </form>
    </CartaoBento>
  );
}
