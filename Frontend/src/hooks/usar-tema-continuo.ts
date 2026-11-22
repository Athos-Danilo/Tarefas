import { useEffect, useMemo, useRef, useState } from 'react';
import {
  calcularPosicaoAstros,
  obterMinutoDeData,
  type PosicaoAstros,
} from '../astronomia/ciclo-solar';
import { calcularFaseLunar, type DadosFaseLunar } from '../astronomia/fase-lunar';
import {
  obterEstadoClimaticoEfetivo,
  obterMinutoAtivo,
  useMotorTemporal,
} from '../astronomia/motor-temporal';
import {
  calcularEstadoCromatico,
  gerarVariaveisCss,
  type EstadoCromatico24h,
} from '../astronomia/sistema-cromatico';
import type { EstadoClimatico, MomentoDoDia } from '../astronomia/tipos';
import { detectarMovimentoReduzidoSistema } from '../cenario/detector-capacidade';
import { criarControladorFavicon, type ControladorFavicon } from '../estilos/controlador-favicon';

export interface EstadoTemaContinuo {
  minuto: number;
  momentoDoDia: MomentoDoDia;
  estadoClimatico: EstadoClimatico;
  cromatico: EstadoCromatico24h;
  astros: PosicaoAstros;
  faseLunar: DadosFaseLunar;
  reduzirMovimento: boolean;
}

export function useTemaContinuo(): EstadoTemaContinuo {
  const modoTemporal = useMotorTemporal((s) => s.modoTemporal);
  const minutoReal = useMotorTemporal((s) => s.minutoReal);
  const minutoSimulado = useMotorTemporal((s) => s.minutoSimulado);
  const timelapseAtivo = useMotorTemporal((s) => s.timelapseAtivo);
  const velocidadeTimelapse = useMotorTemporal((s) => s.velocidadeTimelapse);
  const estadoClimaticoReal = useMotorTemporal((s) => s.estadoClimaticoReal);
  const climaSimulado = useMotorTemporal((s) => s.climaSimulado);
  const movimentoReduzidoManual = useMotorTemporal((s) => s.movimentoReduzido);
  const definirMinutoReal = useMotorTemporal((s) => s.definirMinutoReal);
  const avancarMinutoSimulado = useMotorTemporal((s) => s.avancarMinutoSimulado);

  const [movimentoReduzidoSistema, setMovimentoReduzidoSistema] = useState<boolean>(() =>
    detectarMovimentoReduzidoSistema(),
  );
  const controladorFaviconRef = useRef<ControladorFavicon | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aoAlterar = (evento: MediaQueryListEvent) => {
      setMovimentoReduzidoSistema(evento.matches);
    };
    consulta.addEventListener('change', aoAlterar);
    return () => {
      consulta.removeEventListener('change', aoAlterar);
    };
  }, []);

  useEffect(() => {
    if (modoTemporal !== 'relogio_real') {
      return;
    }
    const atualizarHora = () => {
      definirMinutoReal(obterMinutoDeData(new Date()));
    };
    const intervalo = window.setInterval(atualizarHora, 30_000);
    return () => {
      window.clearInterval(intervalo);
    };
  }, [modoTemporal, definirMinutoReal]);

  useEffect(() => {
    if (!timelapseAtivo) {
      return;
    }
    const intervalo = window.setInterval(() => {
      avancarMinutoSimulado(velocidadeTimelapse * 3);
    }, 120);
    return () => {
      window.clearInterval(intervalo);
    };
  }, [timelapseAtivo, velocidadeTimelapse, avancarMinutoSimulado]);

  const minuto = obterMinutoAtivo({
    modoTemporal,
    minutoReal,
    minutoSimulado,
  } as Parameters<typeof obterMinutoAtivo>[0]);

  const estadoClimatico = obterEstadoClimaticoEfetivo({
    estadoClimaticoReal,
    climaSimulado,
  } as Parameters<typeof obterEstadoClimaticoEfetivo>[0]);

  const cromatico = useMemo(() => calcularEstadoCromatico(minuto), [minuto]);
  const astros = useMemo(() => calcularPosicaoAstros(minuto), [minuto]);
  const faseLunar = useMemo(() => calcularFaseLunar(new Date(), 'sul'), []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const raiz = document.documentElement;
    const variaveis = gerarVariaveisCss(cromatico);
    for (const [chave, valor] of Object.entries(variaveis)) {
      raiz.style.setProperty(chave, valor);
    }
    raiz.dataset.polaridade = cromatico.polaridade;
    raiz.dataset.momento = astros.momentoDoDia;

    if (!controladorFaviconRef.current) {
      controladorFaviconRef.current = criarControladorFavicon(document);
    }
    controladorFaviconRef.current.sincronizarPorMinuto(minuto, cromatico.primaria);
  }, [cromatico, astros.momentoDoDia, minuto]);

  return {
    minuto,
    momentoDoDia: astros.momentoDoDia,
    estadoClimatico,
    cromatico,
    astros,
    faseLunar,
    reduzirMovimento: movimentoReduzidoManual || movimentoReduzidoSistema,
  };
}
