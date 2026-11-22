import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { PosicaoAstros } from '../astronomia/ciclo-solar';
import type { DadosFaseLunar } from '../astronomia/fase-lunar';
import type { EstadoCromatico24h } from '../astronomia/sistema-cromatico';
import type { EstadoClimatico, Qualidade3D } from '../astronomia/tipos';
import { CenarioFallback2D } from './CenarioFallback2D';
import { resolverModoRenderizacao } from './detector-capacidade';
import { calcularPerfilDesempenho3D, type PropriedadesCena3D } from './logica-cena-3d';

const Cenario3DLazy = lazy(() => import('./cena3d/Cenario3D'));

interface PropriedadesErrorBoundary3D {
  fallback: ReactNode;
  children: ReactNode;
}

interface EstadoErrorBoundary3D {
  falhou: boolean;
}

class ErrorBoundary3D extends Component<PropriedadesErrorBoundary3D, EstadoErrorBoundary3D> {
  state: EstadoErrorBoundary3D = { falhou: false };

  static getDerivedStateFromError(): EstadoErrorBoundary3D {
    return { falhou: true };
  }

  render() {
    if (this.state.falhou) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface PropriedadesCenarioDoHorizonte {
  qualidadePreferida: Qualidade3D;
  suporteWebGL: boolean;
  cromatico: EstadoCromatico24h;
  astros: PosicaoAstros;
  faseLunar: DadosFaseLunar;
  estadoClimatico: EstadoClimatico;
  reduzirMovimento: boolean;
  progressoTarefas?: number;
  larguraViewport?: number;
  ComponenteCena3D?: ComponentType<PropriedadesCena3D>;
}

export function CenarioDoHorizonte({
  qualidadePreferida,
  suporteWebGL,
  cromatico,
  astros,
  faseLunar,
  estadoClimatico,
  reduzirMovimento,
  progressoTarefas = 0.65,
  larguraViewport,
  ComponenteCena3D,
}: PropriedadesCenarioDoHorizonte) {
  const [larguraJanela, setLarguraJanela] = useState<number>(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  );
  const [contextoPerdido, setContextoPerdido] = useState<boolean>(false);

  useEffect(() => {
    if (larguraViewport !== undefined || typeof window === 'undefined') {
      return;
    }
    const aoRedimensionar = () => {
      setLarguraJanela(window.innerWidth);
    };
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, [larguraViewport]);

  const resultadoModo = resolverModoRenderizacao({
    qualidadePreferida,
    movimentoReduzido: reduzirMovimento,
    suporteWebGL: suporteWebGL && !contextoPerdido,
  });

  const fallback2D = (
    <CenarioFallback2D
      cromatico={cromatico}
      astros={astros}
      faseLunar={faseLunar}
      estadoClimatico={estadoClimatico}
      reduzirMovimento={reduzirMovimento}
    />
  );

  if (resultadoModo.modo === 'fallback_2d') {
    return fallback2D;
  }

  const perfil = calcularPerfilDesempenho3D(larguraViewport ?? larguraJanela);
  const CenaAtiva = ComponenteCena3D ?? Cenario3DLazy;

  return (
    <ErrorBoundary3D fallback={fallback2D}>
      <Suspense fallback={fallback2D}>
        <CenaAtiva
          cromatico={cromatico}
          astros={astros}
          faseLunar={faseLunar}
          estadoClimatico={estadoClimatico}
          reduzirMovimento={reduzirMovimento}
          progressoTarefas={progressoTarefas}
          perfil={perfil}
          aoPerderContextoWebGL={() => setContextoPerdido(true)}
        />
      </Suspense>
    </ErrorBoundary3D>
  );
}
