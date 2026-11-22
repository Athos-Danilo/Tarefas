import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { calcularAlvoParalaxeCamera } from '../logica-cena-3d';

export interface PropriedadesControladorParalaxe3D {
  reduzirMovimento: boolean;
}

export function ControladorCameraParalaxe3D({
  reduzirMovimento,
}: PropriedadesControladorParalaxe3D) {
  const ponteiroRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (reduzirMovimento || typeof window === 'undefined') {
      ponteiroRef.current = { x: 0, y: 0 };
      return;
    }

    const aoMoverPonteiro = (evento: PointerEvent) => {
      const largura = Math.max(1, window.innerWidth);
      const altura = Math.max(1, window.innerHeight);
      ponteiroRef.current = {
        x: (evento.clientX / largura) * 2 - 1,
        y: (evento.clientY / altura) * 2 - 1,
      };
    };

    window.addEventListener('pointermove', aoMoverPonteiro, { passive: true });
    return () => {
      window.removeEventListener('pointermove', aoMoverPonteiro);
    };
  }, [reduzirMovimento]);

  useFrame((estado, delta) => {
    const [alvoX, alvoY, alvoZ] = calcularAlvoParalaxeCamera(
      ponteiroRef.current.x,
      ponteiroRef.current.y,
      reduzirMovimento,
    );
    const suavizacao = Math.min(1, delta * 3.5);
    estado.camera.position.x = THREE.MathUtils.lerp(estado.camera.position.x, alvoX, suavizacao);
    estado.camera.position.y = THREE.MathUtils.lerp(estado.camera.position.y, alvoY, suavizacao);
    estado.camera.position.z = alvoZ;
    estado.camera.lookAt(0, 1.4, -4);
  });

  return null;
}
