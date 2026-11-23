import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Clock,
  Download,
  Flame,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { obterMomentoDoDia } from '../../astronomia/ciclo-solar';
import {
  obterEstadoClimaticoEfetivo,
  obterMinutoAtivo,
  useMotorTemporal,
} from '../../astronomia/motor-temporal';
import { useEstadoAudio } from '../../audio/estado-audio';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import type {
  EntradaAtualizarPreferencias,
  EscopoEstatisticas,
  EventoDiarioFrontend,
  ModoTemporalPreferencia,
  PeriodoEstatisticas,
  PreferenciasCenarioFrontend,
  Qualidade3dPreferencia,
  ServicoEstatisticasFrontend,
  StatusTutorialPreferencia,
} from '../../servicos/tipos-estatisticas';
import type { ServicoJornadaFrontend } from '../../servicos/tipos-jornada';
import {
  TIPOS_EVENTO_FILTRO,
  construirSeriesDistribuicao,
  formatarDataCurtaBr,
  formatarDuracaoHoras,
  formatarInstanteBr,
  formatarMinutosFoco,
  formatarRotuloTipoEvento,
  horaSimuladaParaMinuto,
  obterClasseIntensidadeCalor,
} from './logica-estatisticas';

export interface PropriedadesPaginaEstatisticas {
  reduzirMovimento: boolean;
  servicoJornada: ServicoJornadaFrontend;
  servicoEstatisticas: ServicoEstatisticasFrontend;
}

const OPCOES_PERIODO: ReadonlyArray<{ valor: PeriodoEstatisticas; rotulo: string }> = [
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: '90d', rotulo: '90 dias' },
  { valor: 'tudo', rotulo: 'Tudo' },
];

const OPCOES_ESCOPO: ReadonlyArray<{ valor: EscopoEstatisticas; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'pessoais', rotulo: 'Pessoais' },
  { valor: 'grupo', rotulo: 'Grupo' },
];

interface EstadoPaginacaoExtra {
  chaveFiltro: string;
  itensExtras: EventoDiarioFrontend[];
  proximoCursor: string | null;
  tinhaCursorInicial: boolean;
}

interface RascunhoPreferencias {
  modoTemporal?: ModoTemporalPreferencia;
  horaSimulada?: string;
  qualidade3d?: Qualidade3dPreferencia;
  reduzirMovimento?: boolean;
  audioHabilitado?: boolean;
  volumeGeral?: number;
  volumeEfeitos?: number;
  volumeAmbiente?: number;
  statusTutorial?: StatusTutorialPreferencia;
}

export function PaginaEstatisticas({
  reduzirMovimento,
  servicoJornada,
  servicoEstatisticas,
}: PropriedadesPaginaEstatisticas) {
  const queryClient = useQueryClient();

  const definirQualidade3D = useMotorTemporal((s) => s.definirQualidade3D);
  const definirMovimentoReduzido = useMotorTemporal((s) => s.definirMovimentoReduzido);
  const definirMinutoSimulado = useMotorTemporal((s) => s.definirMinutoSimulado);
  const ativarRelogioReal = useMotorTemporal((s) => s.ativarRelogioReal);

  const [periodo, setPeriodo] = useState<PeriodoEstatisticas>('30d');
  const [escopo, setEscopo] = useState<EscopoEstatisticas>('todas');
  const [etiquetaId, setEtiquetaId] = useState<string>('');

  const [tipoEventoFiltro, setTipoEventoFiltro] = useState<string>('');
  const [buscaDiario, setBuscaDiario] = useState<string>('');
  const [deExportacao, setDeExportacao] = useState<string>('');
  const [ateExportacao, setAteExportacao] = useState<string>('');

  const [paginacaoExtra, setPaginacaoExtra] = useState<EstadoPaginacaoExtra | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const [rascunhoPrefs, setRascunhoPrefs] = useState<RascunhoPreferencias>({});
  const [mensagemPrefs, setMensagemPrefs] = useState<string | null>(null);
  const [erroPrefs, setErroPrefs] = useState<string | null>(null);

  const chaveDiarioAtual = `${tipoEventoFiltro}|${buscaDiario.trim()}`;

  const consultaEtiquetas = useQuery({
    queryKey: ['etiquetas-estatisticas'],
    queryFn: () => servicoJornada.listarEtiquetas(),
  });

  const consultaResumo = useQuery({
    queryKey: ['estatisticas-resumo', periodo, escopo, etiquetaId],
    queryFn: () =>
      servicoEstatisticas.obterResumo({
        periodo,
        escopo,
        etiquetaId: etiquetaId || null,
      }),
  });

  const consultaDiario = useQuery({
    queryKey: ['diario-eventos', tipoEventoFiltro, buscaDiario.trim()],
    queryFn: () =>
      servicoEstatisticas.listarDiario({
        limite: 15,
        tipo: tipoEventoFiltro || null,
        busca: buscaDiario.trim() || null,
      }),
  });

  const consultaPreferencias = useQuery({
    queryKey: ['preferencias-cenario'],
    queryFn: () => servicoEstatisticas.obterPreferencias(),
  });

  useEffect(() => {
    const prefs = consultaPreferencias.data;
    if (!prefs) {
      return;
    }
    definirQualidade3D(prefs.qualidade3d);
    definirMovimentoReduzido(prefs.reduzirMovimento);
    useEstadoAudio.getState().aplicarPreferenciasAudio(prefs.audio);
  }, [consultaPreferencias.data, definirMovimentoReduzido, definirQualidade3D]);

  const mutacaoPreferencias = useMutation({
    mutationFn: (entrada: EntradaAtualizarPreferencias) =>
      servicoEstatisticas.atualizarPreferencias(entrada),
    onSuccess: (salvas: PreferenciasCenarioFrontend) => {
      queryClient.setQueryData(['preferencias-cenario'], salvas);
      setRascunhoPrefs({});
      setErroPrefs(null);
      setMensagemPrefs('Preferências salvas no seu cenário.');
      definirQualidade3D(salvas.qualidade3d);
      definirMovimentoReduzido(salvas.reduzirMovimento);
      useEstadoAudio.getState().aplicarPreferenciasAudio(salvas.audio);
      if (salvas.modoTemporal === 'simulador') {
        const min = horaSimuladaParaMinuto(salvas.horaSimulada);
        if (min !== null) {
          definirMinutoSimulado(min);
        }
      } else {
        ativarRelogioReal();
      }
    },
    onError: (erro) => {
      setMensagemPrefs(null);
      setErroPrefs(erro instanceof Error ? erro.message : 'Não foi possível salvar preferências.');
    },
  });

  const resumo = consultaResumo.data;

  const seriesSerieTemporal = useMemo(() => {
    if (!resumo) {
      return [];
    }
    return resumo.serieTemporal.map((ponto) => ({
      ...ponto,
      dataCurta: formatarDataCurtaBr(ponto.data),
    }));
  }, [resumo]);

  const distribuicoes = useMemo(() => {
    if (!resumo) {
      return null;
    }
    return construirSeriesDistribuicao(resumo.porTurno, resumo.porPrioridade);
  }, [resumo]);

  const eventosVisiveis = useMemo(() => {
    const base = consultaDiario.data?.itens ?? [];
    if (!paginacaoExtra || paginacaoExtra.chaveFiltro !== chaveDiarioAtual) {
      return base;
    }
    const vistos = new Set(base.map((item) => item.eventoId));
    const combinados = [...base];
    for (const extra of paginacaoExtra.itensExtras) {
      if (!vistos.has(extra.eventoId)) {
        vistos.add(extra.eventoId);
        combinados.push(extra);
      }
    }
    return combinados;
  }, [chaveDiarioAtual, consultaDiario.data?.itens, paginacaoExtra]);

  const cursorCarregarMais = useMemo(() => {
    if (paginacaoExtra && paginacaoExtra.chaveFiltro === chaveDiarioAtual) {
      return paginacaoExtra.proximoCursor;
    }
    return consultaDiario.data?.proximoCursor ?? null;
  }, [chaveDiarioAtual, consultaDiario.data?.proximoCursor, paginacaoExtra]);

  const lidarCarregarMais = async () => {
    if (!cursorCarregarMais || carregandoMais) {
      return;
    }
    setCarregandoMais(true);
    try {
      const proxima = await servicoEstatisticas.listarDiario({
        limite: 15,
        cursor: cursorCarregarMais,
        tipo: tipoEventoFiltro || null,
        busca: buscaDiario.trim() || null,
      });
      setPaginacaoExtra((atual) => {
        const extrasPrevios =
          atual && atual.chaveFiltro === chaveDiarioAtual ? atual.itensExtras : [];
        return {
          chaveFiltro: chaveDiarioAtual,
          itensExtras: [...extrasPrevios, ...proxima.itens],
          proximoCursor: proxima.proximoCursor,
          tinhaCursorInicial: true,
        };
      });
    } finally {
      setCarregandoMais(false);
    }
  };

  const prefsBase = consultaPreferencias.data;
  const modoTemporalAtivo: ModoTemporalPreferencia =
    rascunhoPrefs.modoTemporal ?? prefsBase?.modoTemporal ?? 'relogio_real';
  const horaSimuladaAtiva: string =
    rascunhoPrefs.horaSimulada ?? prefsBase?.horaSimulada ?? '18:00';
  const qualidade3dAtiva: Qualidade3dPreferencia =
    rascunhoPrefs.qualidade3d ?? prefsBase?.qualidade3d ?? 'auto';
  const reduzirMovimentoAtivo: boolean =
    rascunhoPrefs.reduzirMovimento ?? prefsBase?.reduzirMovimento ?? false;
  const audioHabilitadoAtivo: boolean =
    rascunhoPrefs.audioHabilitado ?? prefsBase?.audio.habilitado ?? false;
  const volumeGeralAtivo: number = rascunhoPrefs.volumeGeral ?? prefsBase?.audio.volumeGeral ?? 0.7;
  const volumeEfeitosAtivo: number =
    rascunhoPrefs.volumeEfeitos ?? prefsBase?.audio.volumeEfeitos ?? 0.8;
  const volumeAmbienteAtivo: number =
    rascunhoPrefs.volumeAmbiente ?? prefsBase?.audio.volumeAmbiente ?? 0.5;
  const statusTutorialAtivo: StatusTutorialPreferencia =
    rascunhoPrefs.statusTutorial ?? prefsBase?.tutorial.status ?? 'pendente';

  const lidarSalvarPreferencias = () => {
    setMensagemPrefs(null);
    setErroPrefs(null);
    const carga: EntradaAtualizarPreferencias = {
      modoTemporal: modoTemporalAtivo,
      horaSimulada: modoTemporalAtivo === 'simulador' ? horaSimuladaAtiva : null,
      qualidade3d: qualidade3dAtiva,
      reduzirMovimento: reduzirMovimentoAtivo,
      audio: {
        habilitado: audioHabilitadoAtivo,
        volumeGeral: volumeGeralAtivo,
        volumeEfeitos: volumeEfeitosAtivo,
        volumeAmbiente: volumeAmbienteAtivo,
      },
      tutorial: {
        status: statusTutorialAtivo,
      },
    };
    mutacaoPreferencias.mutate(carga);
  };

  const urlExportacaoMd = servicoEstatisticas.obterUrlExportacaoDiario({
    formato: 'md',
    de: deExportacao || null,
    ate: ateExportacao || null,
  });
  const urlExportacaoJson = servicoEstatisticas.obterUrlExportacaoDiario({
    formato: 'json',
    de: deExportacao || null,
    ate: ateExportacao || null,
  });

  return (
    <div className="flex flex-col gap-6">
      <CartaoBento as="header" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--texto-sec)] uppercase">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span>Observatório do Ciclo</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-[var(--texto)] sm:text-3xl">
              Estatísticas e Diário
            </h1>
            <p className="max-w-2xl text-sm text-[var(--texto-sec)]">
              Acompanhe ritmo, pontualidade, recorrências, retrabalho, registros ricos do seu ciclo
              e preferências visuais do Lume.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Período das estatísticas"
            className="flex flex-wrap gap-1.5"
          >
            {OPCOES_PERIODO.map((opcao) => (
              <Botao
                key={opcao.valor}
                tamanho="sm"
                variante={periodo === opcao.valor ? 'primario' : 'secundario'}
                reduzirMovimento={reduzirMovimento}
                onClick={() => setPeriodo(opcao.valor)}
              >
                {opcao.rotulo}
              </Botao>
            ))}
          </div>

          <div role="group" aria-label="Escopo das tarefas" className="flex flex-wrap gap-1.5">
            {OPCOES_ESCOPO.map((opcao) => (
              <Botao
                key={opcao.valor}
                tamanho="sm"
                variante={escopo === opcao.valor ? 'primario' : 'secundario'}
                reduzirMovimento={reduzirMovimento}
                onClick={() => setEscopo(opcao.valor)}
              >
                {opcao.rotulo}
              </Botao>
            ))}
          </div>

          <select
            aria-label="Filtrar por etiqueta"
            value={etiquetaId}
            onChange={(e) => setEtiquetaId(e.target.value)}
            className="min-h-9 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-xs font-semibold text-[var(--texto)]"
          >
            <option value="">Todas as etiquetas</option>
            {(consultaEtiquetas.data?.itens ?? []).map((etq) => (
              <option key={etq.id} value={etq.id}>
                {etq.nome}
              </option>
            ))}
          </select>
        </div>
      </CartaoBento>

      {consultaResumo.isLoading ? (
        <CartaoBento>
          <p className="text-sm text-[var(--texto-sec)]">
            Calculando indicadores da sua jornada...
          </p>
        </CartaoBento>
      ) : consultaResumo.isError || !resumo ? (
        <CartaoBento>
          <p className="text-sm text-[var(--erro)]">
            Não foi possível carregar os indicadores de produtividade agora.
          </p>
        </CartaoBento>
      ) : (
        <>
          <section
            aria-label="Indicadores principais de produtividade"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <CartaoBento className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--texto-sec)]">
                <span>Taxa de conclusão</span>
                <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold">{resumo.kpis.taxaConclusaoPct}%</p>
              <p className="text-xs text-[var(--texto-sec)]">
                {resumo.kpis.totalConcluidas} concluídas de {resumo.kpis.totalCriadas} criadas
              </p>
            </CartaoBento>

            <CartaoBento className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--texto-sec)]">
                <span>Pontualidade</span>
                <Clock className="h-4 w-4 text-sky-400" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold">{resumo.kpis.pontualidadePct}%</p>
              <p className="text-xs text-[var(--texto-sec)]">
                Tempo médio: {formatarDuracaoHoras(resumo.kpis.tempoMedioConclusaoHoras)}
              </p>
            </CartaoBento>

            <CartaoBento className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--texto-sec)]">
                <span>Sequência ativa</span>
                <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold">{resumo.kpis.sequenciaAtualDias} dias</p>
              <p className="text-xs text-[var(--texto-sec)]">
                Recorde histórico: {resumo.kpis.sequenciaRecordeDias} dias
              </p>
            </CartaoBento>

            <CartaoBento className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--texto-sec)]">
                <span>Foco imersivo</span>
                <Activity className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              </div>
              <p className="text-3xl font-bold">
                {formatarMinutosFoco(resumo.kpis.minutosFocoTotais)}
              </p>
              <p className="text-xs text-[var(--texto-sec)]">
                {resumo.kpis.taxaFocoConcluidoPct}% das sessões concluídas
              </p>
            </CartaoBento>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CartaoBento className="flex flex-col gap-3">
              <h2 className="font-serif text-lg font-bold">Evolução de tarefas e foco</h2>
              <div className="h-[220px] w-full">
                <ResponsiveContainer
                  width="100%"
                  height={220}
                  initialDimension={{ width: 480, height: 220 }}
                >
                  <AreaChart data={seriesSerieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                    <XAxis dataKey="dataCurta" tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="criadas"
                      name="Criadas"
                      stroke="#38BDF8"
                      fill="#38BDF8"
                      fillOpacity={0.22}
                    />
                    <Area
                      type="monotone"
                      dataKey="concluidas"
                      name="Concluídas"
                      stroke="#34D399"
                      fill="#34D399"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CartaoBento>

            <CartaoBento className="flex flex-col gap-3">
              <h2 className="font-serif text-lg font-bold">Conclusões por turno e prioridade</h2>
              {distribuicoes ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer
                      width="100%"
                      height={220}
                      initialDimension={{ width: 480, height: 220 }}
                    >
                      <BarChart data={distribuicoes.porTurno}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                        <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: 'currentColor' }} />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: 'currentColor' }}
                        />
                        <Tooltip />
                        <Bar dataKey="total" name="Concluídas" radius={[6, 6, 0, 0]}>
                          {distribuicoes.porTurno.map((item) => (
                            <Cell key={item.chave} fill={item.cor} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer
                      width="100%"
                      height={220}
                      initialDimension={{ width: 480, height: 220 }}
                    >
                      <BarChart data={distribuicoes.porPrioridade}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                        <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: 'currentColor' }} />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: 'currentColor' }}
                        />
                        <Tooltip />
                        <Bar dataKey="total" name="Concluídas" radius={[6, 6, 0, 0]}>
                          {distribuicoes.porPrioridade.map((item) => (
                            <Cell key={item.chave} fill={item.cor} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </CartaoBento>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CartaoBento className="flex flex-col gap-3 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-bold">Mapa de calor diário</h2>
                <span className="text-xs text-[var(--texto-sec)]">
                  Intensidade de tarefas criadas, concluídas e foco
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5" role="list" aria-label="Mapa de calor diário">
                {resumo.mapaCalor.map((celula) => (
                  <div
                    key={celula.data}
                    role="listitem"
                    data-testid={`celula-calor-${celula.data}`}
                    data-intensidade={celula.intensidade}
                    title={`${formatarDataCurtaBr(celula.data)}: ${celula.acoes} ações`}
                    className={`h-5 w-5 rounded border transition-transform ${obterClasseIntensidadeCalor(celula.intensidade)}`}
                  />
                ))}
              </div>
              {resumo.porEtiqueta.length > 0 ? (
                <div className="mt-2 space-y-2 border-t border-[var(--borda)] pt-3">
                  <p className="text-xs font-semibold text-[var(--texto-sec)]">
                    Etiquetas em destaque
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resumo.porEtiqueta.map((etq) => (
                      <span
                        key={etq.etiquetaId}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1 text-xs font-semibold"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: etq.cor }}
                          aria-hidden="true"
                        />
                        <span>{etq.nome}</span>
                        <span className="text-[var(--texto-sec)]">({etq.concluidas})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </CartaoBento>

            <CartaoBento className="flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--texto-sec)]">
                  <RefreshCw className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>Recorrências e Rotinas</span>
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {resumo.recorrencias.taxaConsistenciaPct}% de consistência
                </p>
                <p className="text-xs text-[var(--texto-sec)]">
                  {resumo.recorrencias.rotinasAtivas} rotinas ativas,{' '}
                  {resumo.recorrencias.ocorrenciasCumpridas} ocorrências cumpridas
                </p>
              </div>

              <div className="border-t border-[var(--borda)] pt-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--texto-sec)]">
                  <Award className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span>Constelações e Estrutura</span>
                </div>
                <p className="mt-1 text-sm font-semibold">
                  Constelações concluídas: {resumo.arvores.constelacoesConcluidas}
                </p>
                <p className="text-xs text-[var(--texto-sec)]">
                  Profundidade média:{' '}
                  {resumo.arvores.profundidadeMedia.toFixed(1).replace('.', ',')} níveis
                </p>
              </div>

              <div className="border-t border-[var(--borda)] pt-3">
                <h3 className="text-xs font-semibold tracking-wider text-[var(--texto-sec)] uppercase">
                  Repetições e retrabalho
                </h3>
                <p className="mt-1 text-xs text-[var(--texto-sec)]">
                  {resumo.repeticoesERetrabalho.totalReaberturas} reaberturas em{' '}
                  {resumo.repeticoesERetrabalho.tarefasReabertasDistintas} tarefas distintas
                </p>
                {resumo.repeticoesERetrabalho.titulosMaisRepetidos.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {resumo.repeticoesERetrabalho.titulosMaisRepetidos.map((rep) => (
                      <li
                        key={rep.tituloNormalizado}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--superficie-alt)] px-2.5 py-1.5 text-xs"
                      >
                        <span className="truncate font-medium">{rep.tituloNormalizado}</span>
                        <span className="shrink-0 text-[var(--texto-sec)]">
                          {rep.concluidas}/{rep.ocorrencias}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-[var(--texto-sec)]">
                    Nenhum título repetido detectado neste recorte.
                  </p>
                )}
              </div>
            </CartaoBento>
          </section>
        </>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CartaoBento className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-400" aria-hidden="true" />
              <h2 className="font-serif text-xl font-bold">Diário do Ciclo</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={urlExportacaoMd}
                download="lume-diario.md"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--texto)] hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exportar Markdown</span>
              </a>
              <a
                href={urlExportacaoJson}
                download="lume-diario.json"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--texto)] hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exportar JSON</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="search"
              aria-label="Buscar no diário"
              placeholder="Buscar resumo..."
              value={buscaDiario}
              onChange={(e) => setBuscaDiario(e.target.value)}
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)]"
            />
            <select
              aria-label="Tipo de evento"
              value={tipoEventoFiltro}
              onChange={(e) => setTipoEventoFiltro(e.target.value)}
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)]"
            >
              {TIPOS_EVENTO_FILTRO.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="Exportar a partir de"
              value={deExportacao}
              onChange={(e) => setDeExportacao(e.target.value)}
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)]"
            />
            <input
              type="date"
              aria-label="Exportar até"
              value={ateExportacao}
              onChange={(e) => setAteExportacao(e.target.value)}
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)]"
            />
          </div>

          {consultaDiario.isLoading ? (
            <p className="text-sm text-[var(--texto-sec)]">Carregando eventos do ciclo...</p>
          ) : eventosVisiveis.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--borda)] p-4 text-sm text-[var(--texto-sec)]">
              Nenhum registro encontrado no diário com esses filtros.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {eventosVisiveis.map((evento) => (
                <li
                  key={evento.eventoId}
                  className="rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--texto-sec)]">
                    <span className="font-semibold text-[var(--texto)]">
                      {formatarRotuloTipoEvento(evento.tipoEvento)}
                    </span>
                    <span>
                      {formatarInstanteBr(evento.criadoEm)}
                      {evento.momentoDoDia ? ` (${evento.momentoDoDia})` : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--texto)]">{evento.resumo}</p>
                </li>
              ))}
            </ul>
          )}

          {cursorCarregarMais ? (
            <div className="flex justify-center pt-1">
              <Botao
                variante="secundario"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                disabled={carregandoMais}
                onClick={() => {
                  void lidarCarregarMais();
                }}
              >
                {carregandoMais ? 'Carregando...' : 'Carregar mais eventos'}
              </Botao>
            </div>
          ) : null}
        </CartaoBento>

        <CartaoBento className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-sky-400" aria-hidden="true" />
            <h2 className="font-serif text-xl font-bold">Preferências do Cenário</h2>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--texto-sec)]">
            <span>Qualidade visual 3D</span>
            <select
              aria-label="Qualidade visual 3D"
              value={qualidade3dAtiva}
              onChange={(e) =>
                setRascunhoPrefs((prev) => ({
                  ...prev,
                  qualidade3d: e.target.value as Qualidade3dPreferencia,
                }))
              }
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)]"
            >
              <option value="auto">Automática</option>
              <option value="alto">Alta qualidade 3D</option>
              <option value="desempenho_2d">Desempenho 2D (leve)</option>
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[var(--texto)]">
            <input
              type="checkbox"
              checked={reduzirMovimentoAtivo}
              onChange={(e) =>
                setRascunhoPrefs((prev) => ({
                  ...prev,
                  reduzirMovimento: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-[var(--primaria)]"
            />
            <span>Reduzir animações e movimentos</span>
          </label>

          <div className="grid grid-cols-1 gap-2 border-t border-[var(--borda)] pt-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--texto-sec)]">
              <span>Modo temporal</span>
              <select
                aria-label="Modo temporal padrão"
                value={modoTemporalAtivo}
                onChange={(e) =>
                  setRascunhoPrefs((prev) => ({
                    ...prev,
                    modoTemporal: e.target.value as ModoTemporalPreferencia,
                  }))
                }
                className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)]"
              >
                <option value="relogio_real">Relógio real</option>
                <option value="simulador">Simulador fixo</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--texto-sec)]">
              <span>Hora simulada</span>
              <input
                type="time"
                aria-label="Hora simulada padrão"
                disabled={modoTemporalAtivo !== 'simulador'}
                value={horaSimuladaAtiva}
                onChange={(e) =>
                  setRascunhoPrefs((prev) => ({
                    ...prev,
                    horaSimulada: e.target.value,
                  }))
                }
                className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)] disabled:opacity-50"
              />
            </label>
          </div>

          <div className="space-y-3 border-t border-[var(--borda)] pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--texto-sec)]">
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Áudio opt-in e volumes</span>
              </span>
              <input
                type="checkbox"
                aria-label="Habilitar áudio do cenário"
                checked={audioHabilitadoAtivo}
                onChange={(e) =>
                  setRascunhoPrefs((prev) => ({
                    ...prev,
                    audioHabilitado: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[var(--primaria)]"
              />
            </div>

            <label className="flex flex-col gap-1 text-xs text-[var(--texto-sec)]">
              <span>Volume geral ({Math.round(volumeGeralAtivo * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volumeGeralAtivo * 100)}
                onChange={(e) =>
                  setRascunhoPrefs((prev) => ({
                    ...prev,
                    volumeGeral: Number(e.target.value) / 100,
                  }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--texto-sec)]">
              <span>Volume efeitos ({Math.round(volumeEfeitosAtivo * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volumeEfeitosAtivo * 100)}
                onChange={(e) =>
                  setRascunhoPrefs((prev) => ({
                    ...prev,
                    volumeEfeitos: Number(e.target.value) / 100,
                  }))
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--texto-sec)]">
              <span>Volume ambiente ({Math.round(volumeAmbienteAtivo * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volumeAmbienteAtivo * 100)}
                onChange={(e) =>
                  setRascunhoPrefs((prev) => ({
                    ...prev,
                    volumeAmbiente: Number(e.target.value) / 100,
                  }))
                }
              />
            </label>

            <div className="flex justify-end">
              <Botao
                variante="secundario"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                onClick={() => {
                  const motor = useMotorTemporal.getState();
                  const audioEstado = useEstadoAudio.getState();
                  audioEstado.aplicarPreferenciasAudio({
                    habilitado: true,
                    volumeGeral: volumeGeralAtivo,
                    volumeEfeitos: volumeEfeitosAtivo,
                    volumeAmbiente: volumeAmbienteAtivo,
                  });
                  audioEstado.sincronizarAmbiente({
                    momentoDoDia: obterMomentoDoDia(obterMinutoAtivo(motor)),
                    estadoClimatico: obterEstadoClimaticoEfetivo(motor),
                    modoFocoAtivo: false,
                    abaVisivel:
                      typeof document === 'undefined'
                        ? true
                        : document.visibilityState !== 'hidden',
                    reduzirMovimento,
                  });
                  audioEstado.tocarEfeito('cascata_concluida');
                }}
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Testar som</span>
              </Botao>
            </div>
          </div>

          <label className="flex flex-col gap-1 border-t border-[var(--borda)] pt-3 text-xs font-semibold text-[var(--texto-sec)]">
            <span>Estado do tutorial guiado</span>
            <select
              aria-label="Estado do tutorial guiado"
              value={statusTutorialAtivo}
              onChange={(e) =>
                setRascunhoPrefs((prev) => ({
                  ...prev,
                  statusTutorial: e.target.value as StatusTutorialPreferencia,
                }))
              }
              className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)]"
            >
              <option value="pendente">Pendente</option>
              <option value="pulado">Pulado</option>
              <option value="concluido">Concluído</option>
            </select>
          </label>

          {mensagemPrefs ? (
            <p role="status" className="text-xs font-semibold text-emerald-400">
              {mensagemPrefs}
            </p>
          ) : null}
          {erroPrefs ? (
            <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
              {erroPrefs}
            </p>
          ) : null}

          <Botao
            variante="primario"
            reduzirMovimento={reduzirMovimento}
            disabled={mutacaoPreferencias.isPending || consultaPreferencias.isLoading}
            onClick={lidarSalvarPreferencias}
          >
            {mutacaoPreferencias.isPending ? 'Salvando...' : 'Salvar preferências'}
          </Botao>
        </CartaoBento>
      </section>
    </div>
  );
}
