import * as Tooltip from '@radix-ui/react-tooltip';
import { MotionConfig } from 'motion/react';
import { useMemo } from 'react';
import { obterSaudacaoDoMomento } from '../astronomia/ciclo-solar';
import { BarraArcoDoDia } from '../cenario/BarraArcoDoDia';
import { CenarioFallback2D } from '../cenario/CenarioFallback2D';
import { detectarSuporteWebGL } from '../cenario/detector-capacidade';
import { BadgePrioridade } from '../componentes/BadgePrioridade';
import { Botao } from '../componentes/Botao';
import { CartaoBento } from '../componentes/CartaoBento';
import { CartaoStatusApi } from '../componentes/CartaoStatusApi';
import { DicaAcessivel } from '../componentes/DicaAcessivel';
import { ModalAcessivel } from '../componentes/ModalAcessivel';
import { SeloMarcaLume } from '../componentes/SeloMarcaLume';
import { RevelacaoSuave } from '../componentes/animacoes/RevelacaoSuave';
import { TextoEscrito } from '../componentes/animacoes/TextoEscrito';
import { useSaudeApi } from '../hooks/usar-saude-api';
import { useTemaContinuo } from '../hooks/usar-tema-continuo';
import { criarClienteSaude } from '../servicos/cliente-saude';
import type { BuscadorDeSaude } from '../servicos/tipos-saude';

interface PropriedadesAplicacao {
  buscadorDeSaude?: BuscadorDeSaude;
}

export function Aplicacao({ buscadorDeSaude }: PropriedadesAplicacao) {
  const buscador = useMemo(() => buscadorDeSaude ?? criarClienteSaude(), [buscadorDeSaude]);
  const { carregando, dados, erro, recarregar } = useSaudeApi(buscador);
  const { minuto, momentoDoDia, estadoClimatico, cromatico, astros, faseLunar, reduzirMovimento } =
    useTemaContinuo();
  const suporteWebGL = useMemo(() => detectarSuporteWebGL(), []);
  const saudacao = obterSaudacaoDoMomento(momentoDoDia);

  return (
    <MotionConfig reducedMotion="user">
      <Tooltip.Provider>
        <CenarioFallback2D
          cromatico={cromatico}
          astros={astros}
          faseLunar={faseLunar}
          estadoClimatico={estadoClimatico}
          reduzirMovimento={reduzirMovimento}
        />

        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
          <RevelacaoSuave reduzirMovimento={reduzirMovimento}>
            <CartaoBento
              as="header"
              destacado
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <SeloMarcaLume faixaFavicon={astros.faixaFavicon} tamanho="hero" />
                <h1 className="fonte-display text-2xl font-bold tracking-tight text-[var(--texto)] sm:text-3xl">
                  {saudacao},{' '}
                  <em className="font-semibold italic text-[var(--primaria)]">
                    <TextoEscrito
                      texto="Horizonte Vivo em movimento"
                      reduzirMovimento={reduzirMovimento}
                    />
                  </em>
                </h1>
              </div>

              <ModalAcessivel
                titulo="Diretrizes visuais da Fase 13"
                descricao="Sistema cromático contínuo 24h, Lua real no Hemisfério Sul e Modo Desempenho 2D."
                gatilho={
                  <Botao variante="secundario" tamanho="sm" reduzirMovimento={reduzirMovimento}>
                    Sobre o sistema visual
                  </Botao>
                }
              >
                <div className="space-y-3 text-sm text-[var(--texto-sec)]">
                  <p>
                    As cores da interface alternam entre polaridade clara (05:45 às 17:29) e noturna
                    (17:30 às 05:44) preservando contraste mínimo WCAG AA em todos os 1.440 minutos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <BadgePrioridade prioridade="baixa" />
                    <BadgePrioridade prioridade="media" />
                    <BadgePrioridade prioridade="alta" />
                    <BadgePrioridade prioridade="urgente" />
                  </div>
                </div>
              </ModalAcessivel>
            </CartaoBento>
          </RevelacaoSuave>

          <RevelacaoSuave atrasoSeg={0.05} reduzirMovimento={reduzirMovimento}>
            <BarraArcoDoDia
              minuto={minuto}
              momentoDoDia={momentoDoDia}
              nomeMomento={cromatico.nomeMomento}
              faseLunar={faseLunar}
              reduzirMovimento={reduzirMovimento}
              suporteWebGL={suporteWebGL}
            />
          </RevelacaoSuave>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <CartaoBento aria-label="Semantica de prioridades" className="h-full space-y-3">
                <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
                  Prioridades acessíveis
                </h2>
                <p className="text-sm text-[var(--texto-sec)]">
                  Cada nível une forma geométrica, rótulo em português e contraste validado ao longo
                  das 24 horas.
                </p>
                <div className="flex flex-wrap gap-2">
                  <DicaAcessivel conteudo="Rotina tranquila sem urgência imediata">
                    <span>
                      <BadgePrioridade prioridade="baixa" />
                    </span>
                  </DicaAcessivel>
                  <DicaAcessivel conteudo="Entrega planejada para o turno atual">
                    <span>
                      <BadgePrioridade prioridade="media" />
                    </span>
                  </DicaAcessivel>
                  <DicaAcessivel conteudo="Prioridade elevada na sua jornada">
                    <span>
                      <BadgePrioridade prioridade="alta" />
                    </span>
                  </DicaAcessivel>
                  <DicaAcessivel conteudo="Dispara alerta na tarefa-mãe enquanto aberta">
                    <span>
                      <BadgePrioridade prioridade="urgente" />
                    </span>
                  </DicaAcessivel>
                </div>
              </CartaoBento>
            </div>

            <div className="lg:col-span-7">
              <CartaoStatusApi
                carregando={carregando}
                dados={dados}
                erro={erro}
                aoTentarNovamente={() => {
                  void recarregar();
                }}
              />
            </div>
          </div>
        </main>
      </Tooltip.Provider>
    </MotionConfig>
  );
}
