import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import type { PosicaoAstros } from '../../astronomia/ciclo-solar';
import { obterSaudacaoDoMomento } from '../../astronomia/ciclo-solar';
import type { DadosFaseLunar } from '../../astronomia/fase-lunar';
import type { EstadoCromatico24h } from '../../astronomia/sistema-cromatico';
import type { MomentoDoDia } from '../../astronomia/tipos';
import { BarraArcoDoDia } from '../../cenario/BarraArcoDoDia';
import { BadgePrioridade } from '../../componentes/BadgePrioridade';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { CartaoStatusApi } from '../../componentes/CartaoStatusApi';
import { DicaAcessivel } from '../../componentes/DicaAcessivel';
import { ModalAcessivel } from '../../componentes/ModalAcessivel';
import { SeloMarcaLume } from '../../componentes/SeloMarcaLume';
import { RevelacaoSuave } from '../../componentes/animacoes/RevelacaoSuave';
import { TextoEscrito } from '../../componentes/animacoes/TextoEscrito';
import { useAutenticacao } from '../../hooks/usar-autenticacao';
import { URL_LOGIN_GOOGLE } from '../../servicos/cliente-autenticacao';
import type { EstadoSaudeApi } from '../../servicos/tipos-saude';
import { DemoArvoreInterativa } from './DemoArvoreInterativa';

export interface PropriedadesPaginaLanding {
  minuto: number;
  momentoDoDia: MomentoDoDia;
  cromatico: EstadoCromatico24h;
  astros: PosicaoAstros;
  faseLunar: DadosFaseLunar;
  reduzirMovimento: boolean;
  suporteWebGL: boolean;
  carregandoSaude: boolean;
  dadosSaude: EstadoSaudeApi | null;
  erroSaude: string | null;
  aoRecarregarSaude: () => void;
  aoMudarProgressoDemo: (progresso: number) => void;
}

export function PaginaLanding({
  minuto,
  momentoDoDia,
  cromatico,
  astros,
  faseLunar,
  reduzirMovimento,
  suporteWebGL,
  carregandoSaude,
  dadosSaude,
  erroSaude,
  aoRecarregarSaude,
  aoMudarProgressoDemo,
}: PropriedadesPaginaLanding) {
  const { estadoSessao } = useAutenticacao();
  const saudacao = obterSaudacaoDoMomento(momentoDoDia);

  const destinoAutenticado = estadoSessao.autenticado
    ? estadoSessao.usuario.primeiroAcessoConcluido
      ? '/jornada'
      : '/primeiro-acesso'
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <RevelacaoSuave reduzirMovimento={reduzirMovimento}>
        <CartaoBento
          as="header"
          destacado
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <SeloMarcaLume faixaFavicon={astros.faixaFavicon} tamanho="hero" />

          <div className="flex flex-wrap items-center gap-2.5">
            <ModalAcessivel
              titulo="Diretrizes visuais do Lume"
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

            {destinoAutenticado ? (
              <Link
                to={destinoAutenticado}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primaria)] px-4 py-2 text-sm font-semibold text-[var(--primaria-texto)] shadow-sm transition-colors hover:opacity-95"
              >
                <span>Ir para minha Jornada</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <a
                href={URL_LOGIN_GOOGLE}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primaria)] px-4 py-2 text-sm font-semibold text-[var(--primaria-texto)] shadow-sm transition-colors hover:opacity-95"
              >
                <span>Entrar com Google</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </CartaoBento>
      </RevelacaoSuave>

      <RevelacaoSuave atrasoSeg={0.04} reduzirMovimento={reduzirMovimento}>
        <CartaoBento className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1 text-xs font-semibold text-[var(--primaria)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Horizonte Vivo em 24h</span>
          </div>

          <h1 className="fonte-display text-3xl font-bold tracking-tight text-[var(--texto)] sm:text-4xl">
            {saudacao}. Organize suas <strong className="font-bold">metas</strong> e ilumine seu{' '}
            <em className="font-semibold italic text-[var(--primaria)]">
              <TextoEscrito
                texto="jardim e suas constelações"
                reduzirMovimento={reduzirMovimento}
              />
            </em>
          </h1>

          <p className="max-w-3xl text-sm text-[var(--texto-sec)] sm:text-base">
            Experimente abaixo o ciclo contínuo de 24 horas, a Lua na fase real do Hemisfério Sul e
            a progressão automática de subtarefas antes mesmo de entrar com sua conta Google.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {destinoAutenticado ? (
              <Link
                to={destinoAutenticado}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--primaria)] px-5 py-2.5 text-base font-semibold text-[var(--primaria-texto)] shadow-sm"
              >
                <span>Continuar no Lume</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <a
                href={URL_LOGIN_GOOGLE}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--primaria)] px-5 py-2.5 text-base font-semibold text-[var(--primaria-texto)] shadow-sm"
              >
                <span>Começar com Google</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </CartaoBento>
      </RevelacaoSuave>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <BarraArcoDoDia
            minuto={minuto}
            momentoDoDia={momentoDoDia}
            nomeMomento={cromatico.nomeMomento}
            faseLunar={faseLunar}
            reduzirMovimento={reduzirMovimento}
            suporteWebGL={suporteWebGL}
          />
        </div>

        <div className="lg:col-span-6">
          <DemoArvoreInterativa
            reduzirMovimento={reduzirMovimento}
            aoMudarProgresso={aoMudarProgressoDemo}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CartaoBento aria-label="Semântica de prioridades" className="h-full space-y-3">
            <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
              Prioridades acessíveis
            </h2>
            <p className="text-sm text-[var(--texto-sec)]">
              Cada nível une símbolo geométrico, rótulo em português e contraste validado ao longo
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
            carregando={carregandoSaude}
            dados={dadosSaude}
            erro={erroSaude}
            aoTentarNovamente={aoRecarregarSaude}
          />
        </div>
      </div>
    </main>
  );
}
