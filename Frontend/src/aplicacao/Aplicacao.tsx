import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router';
import { useMotorTemporal } from '../astronomia/motor-temporal';
import { CenarioDoHorizonte } from '../cenario/CenarioDoHorizonte';
import { detectarSuporteWebGL } from '../cenario/detector-capacidade';
import { PaginaCalendarioMensal } from '../dominios/calendario/PaginaCalendarioMensal';
import { PaginaPrimeiroAcesso } from '../dominios/conta/PaginaPrimeiroAcesso';
import { PaginaPerfil } from '../dominios/conta/PaginaPerfil';
import { PaginaEstatisticas } from '../dominios/estatisticas/PaginaEstatisticas';
import { PaginaConviteGrupo } from '../dominios/grupos/PaginaConviteGrupo';
import { PaginaJornada } from '../dominios/jornada/PaginaJornada';
import { PaginaLanding } from '../dominios/landing/PaginaLanding';
import { PaginaMapaConstelacao } from '../dominios/mapa/PaginaMapaConstelacao';
import { PaginaModoFoco } from '../dominios/foco/PaginaModoFoco';
import { useSaudeApi } from '../hooks/usar-saude-api';
import { useTemaContinuo } from '../hooks/usar-tema-continuo';
import { criarServicoCalendario } from '../servicos/cliente-calendario';
import { criarServicoConstelacoes } from '../servicos/cliente-constelacoes';
import { criarServicoEstatisticas } from '../servicos/cliente-estatisticas';
import { criarServicoFoco } from '../servicos/cliente-foco';
import { criarServicoGrupos } from '../servicos/cliente-grupos';
import { criarServicoJornada } from '../servicos/cliente-jornada';
import { criarClienteSaude } from '../servicos/cliente-saude';
import type { ServicoCalendarioFrontend } from '../servicos/tipos-calendario';
import type { ServicoConstelacoesFrontend } from '../servicos/tipos-constelacoes';
import type { ServicoAutenticacaoFrontend } from '../servicos/tipos-conta';
import type { ServicoEstatisticasFrontend } from '../servicos/tipos-estatisticas';
import type { ServicoFocoFrontend } from '../servicos/tipos-foco';
import type { ServicoGruposFrontend } from '../servicos/tipos-grupos';
import type { ServicoJornadaFrontend } from '../servicos/tipos-jornada';
import type { BuscadorDeSaude } from '../servicos/tipos-saude';
import { CascaWorkspace } from './CascaWorkspace';
import { RotaAutenticada, RotaPrimeiroAcesso } from './GuardasRota';
import { ProvedorAutenticacao } from './ProvedorAutenticacao';

interface PropriedadesAplicacao {
  buscadorDeSaude?: BuscadorDeSaude;
  servicoAutenticacao?: ServicoAutenticacaoFrontend;
  servicoJornada?: ServicoJornadaFrontend;
  servicoGrupos?: ServicoGruposFrontend;
  servicoConstelacoes?: ServicoConstelacoesFrontend;
  servicoFoco?: ServicoFocoFrontend;
  servicoCalendario?: ServicoCalendarioFrontend;
  servicoEstatisticas?: ServicoEstatisticasFrontend;
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

            <RoteadorAplicacao rotaInicial={rotaInicial}>
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
                      element={<PaginaPerfil reduzirMovimento={reduzirMovimento} />}
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
            </RoteadorAplicacao>
          </Tooltip.Provider>
        </MotionConfig>
      </ProvedorAutenticacao>
    </QueryClientProvider>
  );
}
