import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Botao } from '../../componentes/Botao';
import {
  PASSOS_TUTORIAL_LUME,
  TOTAL_PASSOS_TUTORIAL,
  calcularGeometriaSpotlight,
  type RetanguloAlvo,
  type ViewportJanela,
} from './passos-tutorial';

export interface PropriedadesTourGuiadoLume {
  aberto: boolean;
  passoNumero: number;
  reduzirMovimento: boolean;
  aoAvancar: () => void;
  aoVoltar: () => void;
  aoPular: () => void;
}

function obterRetanguloVisivel(seletor: string | null): RetanguloAlvo | null {
  if (!seletor || typeof document === 'undefined') {
    return null;
  }
  const candidatos = document.querySelectorAll(seletor);
  for (const elemento of candidatos) {
    const rect = elemento.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    }
  }
  return null;
}

export function TourGuiadoLume({
  aberto,
  passoNumero,
  reduzirMovimento,
  aoAvancar,
  aoVoltar,
  aoPular,
}: PropriedadesTourGuiadoLume) {
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const elementoAnteriorRef = useRef<HTMLElement | null>(null);
  const estavaAbertoRef = useRef(false);
  const [medicaoTela, setMedicaoTela] = useState<{
    rect: RetanguloAlvo | null;
    viewport: ViewportJanela;
  }>({
    rect: null,
    viewport: {
      largura: typeof window !== 'undefined' ? window.innerWidth : 1280,
      altura: typeof window !== 'undefined' ? window.innerHeight : 800,
    },
  });

  const indiceSeguro = Math.min(TOTAL_PASSOS_TUTORIAL, Math.max(1, passoNumero)) - 1;
  const passoAtual = PASSOS_TUTORIAL_LUME[indiceSeguro] ?? PASSOS_TUTORIAL_LUME[0];

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const atualizarMedicao = () => {
      setMedicaoTela({
        rect: obterRetanguloVisivel(passoAtual.seletorAlvo),
        viewport: {
          largura: window.innerWidth,
          altura: window.innerHeight,
        },
      });
    };

    const quadroId = window.requestAnimationFrame(atualizarMedicao);
    window.addEventListener('resize', atualizarMedicao);
    window.addEventListener('scroll', atualizarMedicao, true);

    return () => {
      window.cancelAnimationFrame(quadroId);
      window.removeEventListener('resize', atualizarMedicao);
      window.removeEventListener('scroll', atualizarMedicao, true);
    };
  }, [aberto, passoAtual.seletorAlvo]);

  useEffect(() => {
    if (aberto) {
      estavaAbertoRef.current = true;
      const ativo = document.activeElement;
      elementoAnteriorRef.current = ativo instanceof HTMLElement ? ativo : null;
      return;
    }

    if (estavaAbertoRef.current) {
      estavaAbertoRef.current = false;
      const anterior = elementoAnteriorRef.current;
      elementoAnteriorRef.current = null;
      if (anterior && anterior.isConnected) {
        anterior.focus();
      }
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const focarAoAbrir = window.requestAnimationFrame(() => {
      dialogoRef.current?.focus();
    });

    const lidarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        aoPular();
        return;
      }

      if (evento.key === 'Tab' && dialogoRef.current) {
        const focaveis = dialogoRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focaveis.length === 0) {
          return;
        }
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
        return;
      }

      const tagAtiva = (document.activeElement as HTMLElement | null)?.tagName;
      if (tagAtiva === 'INPUT' || tagAtiva === 'TEXTAREA' || tagAtiva === 'SELECT') {
        return;
      }

      if (evento.key === 'ArrowRight') {
        evento.preventDefault();
        aoAvancar();
      } else if (evento.key === 'ArrowLeft') {
        evento.preventDefault();
        aoVoltar();
      }
    };

    document.addEventListener('keydown', lidarTeclado);
    return () => {
      window.cancelAnimationFrame(focarAoAbrir);
      document.removeEventListener('keydown', lidarTeclado);
    };
  }, [aberto, aoAvancar, aoPular, aoVoltar]);

  const geometria = useMemo(
    () => calcularGeometriaSpotlight(medicaoTela.rect, medicaoTela.viewport),
    [medicaoTela.rect, medicaoTela.viewport],
  );

  if (!aberto) {
    return null;
  }

  const ehPrimeiro = passoAtual.numero === 1;
  const ehUltimo = passoAtual.numero === TOTAL_PASSOS_TUTORIAL;

  return (
    <div className="fixed inset-0 z-50" aria-hidden={false}>
      {!geometria.centralizado && geometria.recorte ? (
        <div
          data-testid="recorte-spotlight-tutorial"
          className={`pointer-events-none fixed rounded-2xl border-2 border-amber-300 shadow-[0_0_0_9999px_rgba(8,13,28,0.72)] ${
            reduzirMovimento ? '' : 'transition-all duration-200'
          }`}
          style={{
            top: `${geometria.recorte.top}px`,
            left: `${geometria.recorte.left}px`,
            width: `${geometria.recorte.width}px`,
            height: `${geometria.recorte.height}px`,
          }}
        />
      ) : (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px]"
          onClick={aoPular}
          aria-hidden="true"
        />
      )}

      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour guiado do Lume: ${passoAtual.titulo}`}
        aria-describedby="descricao-tour-lume"
        tabIndex={-1}
        style={
          geometria.centralizado
            ? undefined
            : {
                top: `${geometria.cartaoTop}px`,
                left: `${geometria.cartaoLeft}px`,
                width: `${geometria.cartaoLargura}px`,
              }
        }
        className={
          geometria.centralizado
            ? 'superficie-bento fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--primaria)] p-5 text-[var(--texto)] shadow-2xl focus:outline-none'
            : 'superficie-bento fixed z-50 max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--primaria)] p-5 text-[var(--texto)] shadow-2xl focus:outline-none'
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--superficie-alt)] px-2.5 py-1 text-xs font-bold text-[var(--primaria)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Passo {passoAtual.numero} de 6</span>
          </span>

          <button
            type="button"
            onClick={aoPular}
            aria-label="Fechar tour guiado"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--texto-sec)] hover:bg-[var(--superficie-alt)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <h2
          id="titulo-tour-lume"
          className="fonte-display mt-3 text-lg font-bold text-[var(--texto)]"
        >
          {passoAtual.titulo}
        </h2>

        <p
          id="descricao-tour-lume"
          className="mt-2 text-sm leading-relaxed text-[var(--texto-sec)]"
        >
          {passoAtual.descricao}
        </p>

        <p className="mt-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2 text-xs font-medium text-[var(--texto)]">
          {passoAtual.dicaPratica}
        </p>

        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          {PASSOS_TUTORIAL_LUME.map((item) => (
            <span
              key={item.numero}
              className={`h-1.5 flex-1 rounded-full ${
                item.numero <= passoAtual.numero ? 'bg-[var(--primaria)]' : 'bg-[var(--borda)]'
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Botao
            type="button"
            variante="fantasma"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            onClick={aoPular}
          >
            Pular tutorial
          </Botao>

          <div className="flex items-center gap-2">
            <Botao
              type="button"
              variante="secundario"
              tamanho="sm"
              disabled={ehPrimeiro}
              reduzirMovimento={reduzirMovimento}
              onClick={aoVoltar}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Voltar</span>
            </Botao>

            <Botao
              type="button"
              variante="primario"
              tamanho="sm"
              reduzirMovimento={reduzirMovimento}
              onClick={aoAvancar}
            >
              {ehUltimo ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Concluir tutorial</span>
                </>
              ) : (
                <>
                  <span>Próximo</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
