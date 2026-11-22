import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CAMERA_REPOUSO_3D,
  calcularParametrosCena3D,
  type PropriedadesCena3D,
} from '../logica-cena-3d';
import { Astros3D } from './Astros3D';
import { CeuAtmosferico3D } from './CeuAtmosferico3D';
import { ClimaAtmosferico3D } from './ClimaAtmosferico3D';
import { ControladorCameraParalaxe3D } from './ControladorCameraParalaxe3D';
import { JardimSoft3D } from './JardimSoft3D';

export default function Cenario3D({
  cromatico,
  astros,
  faseLunar,
  estadoClimatico,
  reduzirMovimento,
  progressoTarefas,
  perfil,
  aoPerderContextoWebGL,
}: PropriedadesCena3D) {
  const [abaVisivel, setAbaVisivel] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );
  const limparListenerPerdaRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const aoMudarVisibilidade = () => {
      setAbaVisivel(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (limparListenerPerdaRef.current) {
        limparListenerPerdaRef.current();
        limparListenerPerdaRef.current = null;
      }
    };
  }, []);

  const parametros = useMemo(
    () =>
      calcularParametrosCena3D({
        cromatico,
        astros,
        faseLunar,
        estadoClimatico,
        progressoTarefas,
        reduzirMovimento,
        perfil,
      }),
    [cromatico, astros, faseLunar, estadoClimatico, progressoTarefas, reduzirMovimento, perfil],
  );

  const flashesAtivos = parametros.clima.intensidadeRelampagoMax > 0;

  return (
    <div
      data-testid="cenario-3d-webgl"
      data-modo-renderizacao="3d"
      data-perfil-3d={perfil.perfil}
      data-estado-climatico={estadoClimatico}
      data-flashes-ativos={flashesAtivos ? 'true' : 'false'}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      <Canvas
        dpr={perfil.dpr}
        shadows={perfil.sombrasAtivas}
        frameloop={abaVisivel ? 'always' : 'demand'}
        camera={{
          position: [CAMERA_REPOUSO_3D[0], CAMERA_REPOUSO_3D[1], CAMERA_REPOUSO_3D[2]],
          fov: 44,
          near: 0.1,
          far: 160,
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          const telaCanvas = gl.domElement;
          const aoPerder = (evento: Event) => {
            evento.preventDefault();
            aoPerderContextoWebGL();
          };
          telaCanvas.addEventListener('webglcontextlost', aoPerder);
          limparListenerPerdaRef.current = () => {
            telaCanvas.removeEventListener('webglcontextlost', aoPerder);
          };
        }}
      >
        <CeuAtmosferico3D
          ceuTopo={cromatico.ceuTopo}
          ceuMeio={cromatico.ceuMeio}
          ceuBase={cromatico.ceuBase}
          escurecimentoClima={parametros.clima.escurecimentoCeu}
        />
        <Astros3D
          parametros={parametros}
          solVisivel={astros.solVisivel}
          luaVisivel={astros.luaVisivel}
          opacidadeEstrelas={cromatico.opacidadeEstrelas}
          corAstro={cromatico.astro}
          perfil={perfil}
        />
        <JardimSoft3D
          colina1={cromatico.colina1}
          colina2={cromatico.colina2}
          colina3={cromatico.colina3}
          escalaFlorescimento={parametros.escalaFlorescimento}
          opacidadeVagalumes={parametros.opacidadeVagalumes}
          reduzirMovimento={reduzirMovimento}
          perfil={perfil}
        />
        <ClimaAtmosferico3D
          clima={parametros.clima}
          reduzirMovimento={reduzirMovimento}
          perfil={perfil}
        />
        <ControladorCameraParalaxe3D reduzirMovimento={reduzirMovimento} />
      </Canvas>
    </div>
  );
}
