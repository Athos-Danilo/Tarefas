import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { Suspense, lazy, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router';
import { useMotorTemporal } from '../astronomia/motor-temporal';
import { OrquestradorAudioLume } from '../audio/OrquestradorAudioLume';
import { CenarioDoHorizonte } from '../cenario/CenarioDoHorizonte';
import { detectarSuporteWebGL } from '../cenario/detector-capacidade';
import { PaginaLanding } from '../dominios/landing/PaginaLanding';
import { useSaudeApi } from '../hooks/usar-saude-api';
import { useTemaContinuo } from '../hooks/usar-tema-continuo';
import { criarServicoCalendario } from '../servicos/cliente-calendario';
import { criarServicoConstelacoes } from '../servicos/cliente-constelacoes';
import { criarServicoEstatisticas } from '../servicos/cliente-estatisticas';
import { criarServicoFoco } from '../servicos/cliente-foco';
import { criarServicoGrupos } from '../servicos/cliente-grupos';
import { criarServicoJornada } from '../servicos/cliente-jornada';
import { criarServicoPush } from '../servicos/cliente-push';
import { criarClienteSaude } from '../servicos/cliente-saude';
import type { ServicoCalendarioFrontend } from '../servicos/tipos-calendario';
import type { ServicoConstelacoesFrontend } from '../servicos/tipos-constelacoes';
import type { ServicoAutenticacaoFrontend } from '../servicos/tipos-conta';
import type { ServicoEstatisticasFrontend } from '../servicos/tipos-estatisticas';
import type { ServicoFocoFrontend } from '../servicos/tipos-foco';
import type { ServicoGruposFrontend } from '../servicos/tipos-grupos';
import type { ServicoJornadaFrontend } from '../servicos/tipos-jornada';
import type { ServicoPushFrontend } from '../servicos/tipos-push';
import type { BuscadorDeSaude } from '../servicos/tipos-saude';
import { CascaWorkspace } from './CascaWorkspace';
import { RotaAutenticada, RotaPrimeiroAcesso } from './GuardasRota';
import { ProvedorAutenticacao } from './ProvedorAutenticacao';

const PaginaCalendarioMensal = lazy(() =>
  import('../dominios/calendario/PaginaCalendarioMensal').then((modulo) => ({
    default: modulo.PaginaCalendarioMensal,
  })),
);
const PaginaPrimeiroAcesso = lazy(() =>
  import('../dominios/conta/PaginaPrimeiroAcesso').then((modulo) => ({
    default: modulo.PaginaPrimeiroAcesso,
  })),
);
const PaginaPerfil = lazy(() =>
  import('../dominios/conta/PaginaPerfil').then((modulo) => ({
    default: modulo.PaginaPerfil,
  })),
);
const PaginaEstatisticas = lazy(() =>
  import('../dominios/estatisticas/PaginaEstatisticas').then((modulo) => ({
    default: modulo.PaginaEstatisticas,
  })),
);
const PaginaConviteGrupo = lazy(() =>
  import('../dominios/grupos/PaginaConviteGrupo').then((modulo) => ({
    default: modulo.PaginaConviteGrupo,
  })),
);
const PaginaJornada = lazy(() =>
  import('../dominios/jornada/PaginaJornada').then((modulo) => ({
    default: modulo.PaginaJornada,
  })),
);
const PaginaMapaConstelacao = lazy(() =>
  import('../dominios/mapa/PaginaMapaConstelacao').then((modulo) => ({
    default: modulo.PaginaMapaConstelacao,
  })),
);
const PaginaModoFoco = lazy(() =>
  import('../dominios/foco/PaginaModoFoco').then((modulo) => ({
    default: modulo.PaginaModoFoco,
  })),
);

function FallbackCarregamentoRota() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center px-6 py-12"
    >
      <p className="superficie-bento rounded-2xl px-5 py-3 text-sm font-medium text-[var(--texto-sec)]">
        Carregando espaço no Lume...
      </p>
    </div>
  );
}

interface PropriedadesAplicacao {
  buscadorDeSaude?: BuscadorDeSaude;
  servicoAutenticacao?: ServicoAutenticacaoFrontend;
  servicoJornada?: ServicoJornadaFrontend;
  servicoGrupos?: ServicoGruposFrontend;
  servicoConstelacoes?: ServicoConstelacoesFrontend;
  servicoFoco?: ServicoFocoFrontend;
  servicoCalendario?: ServicoCalendarioFrontend;
  servicoEstatisticas?: ServicoEstatisticasFrontend;
  servicoPush?: ServicoPushFrontend;
  rotaInicial?: string;
}

function RoteadorAplicacao({
  rotaInicial,
  children,
}: {
  rotaInicial?: string;
  children: ReactNode;
}) {
  if (rotaInicial !== undefined) {
    return <MemoryRouter initialEntries={[rotaInicial]}>{children}</MemoryRouter>;
  }
  return <BrowserRouter>{children}</BrowserRouter>;
}

export function Aplicacao({
  buscadorDeSaude,
  servicoAutenticacao,
  servicoJornada,
  servicoGrupos,
  servicoConstelacoes,
  servicoFoco,
  servicoCalendario,
  servicoEstatisticas,
  servicoPush,
  rotaInicial,
}: PropriedadesAplicacao) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
  );
  const [progressoCenario, setProgressoCenario] = useState(0.25);
  const [modoFocoContemplativo, setModoFocoContemplativo] = useState(false);

  const buscador = useMemo(() => buscadorDeSaude ?? criarClienteSaude(), [buscadorDeSaude]);
  const jornada = useMemo(() => servicoJornada ?? criarServicoJornada(), [servicoJornada]);
  const grupos = useMemo(() => servicoGrupos ?? criarServicoGrupos(), [servicoGrupos]);
  const constelacoes = useMemo(
    () => servicoConstelacoes ?? criarServicoConstelacoes(),
    [servicoConstelacoes],
  );
  const foco = useMemo(() => servicoFoco ?? criarServicoFoco(), [servicoFoco]);
  const calendario = useMemo(
    () => servicoCalendario ?? criarServicoCalendario(),
    [servicoCalendario],
  );
  const estatisticas = useMemo(
    () => servicoEstatisticas ?? criarServicoEstatisticas(),
    [servicoEstatisticas],
  );
  const push = useMemo(() => servicoPush ?? criarServicoPush(), [servicoPush]);
  const { carregando, dados, erro, recarregar } = useSaudeApi(buscador);
  const { minuto, momentoDoDia, estadoClimatico, cromatico, astros, faseLunar, reduzirMovimento } =
    useTemaContinuo();
  const qualidade3D = useMotorTemporal((s) => s.qualidade3D);
  const suporteWebGL = useMemo(() => detectarSuporteWebGL(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ProvedorAutenticacao servicoAutenticacao={servicoAutenticacao}>
        <MotionConfig reducedMotion="user">
          <Tooltip.Provider>
            <CenarioDoHorizonte
              qualidadePreferida={qualidade3D}
              suporteWebGL={suporteWebGL}
              progressoTarefas={progressoCenario}
              modoContemplativo={modoFocoContemplativo}
              cromatico={cromatico}
              astros={astros}
              faseLunar={faseLunar}
              estadoClimatico={estadoClimatico}
              reduzirMovimento={reduzirMovimento}
            />

            <OrquestradorAudioLume
              momentoDoDia={momentoDoDia}
              estadoClimatico={estadoClimatico}
              modoFocoAtivo={modoFocoContemplativo}
              reduzirMovimento={reduzirMovimento}
            />

            <RoteadorAplicacao rotaInicial={rotaInicial}>
              <Suspense fallback={<FallbackCarregamentoRota />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <PaginaLanding
                        minuto={minuto}
                        momentoDoDia={momentoDoDia}
                        cromatico={cromatico}
                        astros={astros}
                        faseLunar={faseLunar}
                        reduzirMovimento={reduzirMovimento}
                        suporteWebGL={suporteWebGL}
                        carregandoSaude={carregando}
                        dadosSaude={dados}
                        erroSaude={erro}
                        aoRecarregarSaude={() => {
                          void recarregar();
                        }}
                        aoMudarProgressoDemo={setProgressoCenario}
                      />
                    }
                  />

                  <Route element={<RotaPrimeiroAcesso />}>
                    <Route
                      path="/primeiro-acesso"
                      element={
                        <PaginaPrimeiroAcesso
                          faixaFavicon={astros.faixaFavicon}
                          reduzirMovimento={reduzirMovimento}
                        />
                      }
                    />
                  </Route>

                  <Route element={<RotaAutenticada />}>
                    <Route
                      element={
                        <CascaWorkspace
                          faixaFavicon={astros.faixaFavicon}
                          reduzirMovimento={reduzirMovimento}
                          servicoEstatisticas={estatisticas}
                        />
                      }
                    >
                      <Route
                        path="/jornada"
                        element={
                          <PaginaJornada
                            minuto={minuto}
                            momentoDoDia={momentoDoDia}
                            nomeMomento={cromatico.nomeMomento}
                            faseLunar={faseLunar}
                            reduzirMovimento={reduzirMovimento}
                            suporteWebGL={suporteWebGL}
                            servico={jornada}
                            servicoGrupos={grupos}
                            servicoPush={push}
                            aoMudarProgressoJornada={setProgressoCenario}
                          />
                        }
                      />
                      <Route
                        path="/mapa"
                        element={
                          <PaginaMapaConstelacao
                            momentoDoDia={momentoDoDia}
                            faseLunar={faseLunar}
                            reduzirMovimento={reduzirMovimento}
                            servicoJornada={jornada}
                            servicoGrupos={grupos}
                            servicoConstelacoes={constelacoes}
                            aoMudarProgressoJornada={setProgressoCenario}
                          />
                        }
                      />
                      <Route
                        path="/foco"
                        element={
                          <PaginaModoFoco
                            momentoDoDia={momentoDoDia}
                            faseLunar={faseLunar}
                            reduzirMovimento={reduzirMovimento}
                            servicoJornada={jornada}
                            servicoFoco={foco}
                            aoMudarModoContemplativo={setModoFocoContemplativo}
                          />
                        }
                      />
                      <Route
                        path="/calendario"
                        element={
                          <PaginaCalendarioMensal
                            reduzirMovimento={reduzirMovimento}
                            servicoJornada={jornada}
                            servicoGrupos={grupos}
                            servicoCalendario={calendario}
                            servicoPush={push}
                          />
                        }
                      />
                      <Route
                        path="/estatisticas"
                        element={
                          <PaginaEstatisticas
                            reduzirMovimento={reduzirMovimento}
                            servicoJornada={jornada}
                            servicoEstatisticas={estatisticas}
                          />
                        }
                      />
                      <Route
                        path="/perfil"
                        element={
                          <PaginaPerfil reduzirMovimento={reduzirMovimento} servicoPush={push} />
                        }
                      />
                    </Route>
                  </Route>

                  <Route
                    path="/convite/:token"
                    element={
                      <PaginaConviteGrupo
                        faixaFavicon={astros.faixaFavicon}
                        servicoGrupos={grupos}
                        reduzirMovimento={reduzirMovimento}
                      />
                    }
                  />
                  <Route
                    path="/convites/:token"
                    element={
                      <PaginaConviteGrupo
                        faixaFavicon={astros.faixaFavicon}
                        servicoGrupos={grupos}
                        reduzirMovimento={reduzirMovimento}
                      />
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </RoteadorAplicacao>
          </Tooltip.Provider>
        </MotionConfig>
      </ProvedorAutenticacao>
    </QueryClientProvider>
  );
}
