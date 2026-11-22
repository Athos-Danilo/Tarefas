import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router';
import { useMotorTemporal } from '../astronomia/motor-temporal';
import { CenarioDoHorizonte } from '../cenario/CenarioDoHorizonte';
import { detectarSuporteWebGL } from '../cenario/detector-capacidade';
import { PaginaPrimeiroAcesso } from '../dominios/conta/PaginaPrimeiroAcesso';
import { PaginaPerfil } from '../dominios/conta/PaginaPerfil';
import { PaginaJornadaInicial } from '../dominios/jornada/PaginaJornadaInicial';
import { PaginaLanding } from '../dominios/landing/PaginaLanding';
import { useSaudeApi } from '../hooks/usar-saude-api';
import { useTemaContinuo } from '../hooks/usar-tema-continuo';
import { criarClienteSaude } from '../servicos/cliente-saude';
import type { ServicoAutenticacaoFrontend } from '../servicos/tipos-conta';
import type { BuscadorDeSaude } from '../servicos/tipos-saude';
import { CascaWorkspace } from './CascaWorkspace';
import { RotaAutenticada, RotaPrimeiroAcesso } from './GuardasRota';
import { ProvedorAutenticacao } from './ProvedorAutenticacao';

interface PropriedadesAplicacao {
  buscadorDeSaude?: BuscadorDeSaude;
  servicoAutenticacao?: ServicoAutenticacaoFrontend;
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
  const [progressoDemo, setProgressoDemo] = useState(0.25);

  const buscador = useMemo(() => buscadorDeSaude ?? criarClienteSaude(), [buscadorDeSaude]);
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
              progressoTarefas={progressoDemo}
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
                      aoMudarProgressoDemo={setProgressoDemo}
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
                        <PaginaJornadaInicial
                          minuto={minuto}
                          momentoDoDia={momentoDoDia}
                          nomeMomento={cromatico.nomeMomento}
                          faseLunar={faseLunar}
                          reduzirMovimento={reduzirMovimento}
                          suporteWebGL={suporteWebGL}
                        />
                      }
                    />
                    <Route
                      path="/perfil"
                      element={<PaginaPerfil reduzirMovimento={reduzirMovimento} />}
                    />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </RoteadorAplicacao>
          </Tooltip.Provider>
        </MotionConfig>
      </ProvedorAutenticacao>
    </QueryClientProvider>
  );
}
