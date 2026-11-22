import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  criarGeradorDeterministico,
  type ParametrosClima3D,
  type PerfilDesempenho3D,
} from '../logica-cena-3d';

export interface PropriedadesClimaAtmosferico3D {
  clima: ParametrosClima3D;
  reduzirMovimento: boolean;
  perfil: PerfilDesempenho3D;
}

export function ClimaAtmosferico3D({
  clima,
  reduzirMovimento,
  perfil,
}: PropriedadesClimaAtmosferico3D) {
  const refNuvens = useRef<THREE.InstancedMesh | null>(null);
  const refChuva = useRef<THREE.InstancedMesh | null>(null);
  const refRelampago = useRef<THREE.PointLight | null>(null);
  const objetoAuxiliar = useMemo(() => new THREE.Object3D(), []);

  const totalPuffsNuvem = perfil.maxNuvens * 4;

  const nuvensBase = useMemo(() => {
    const rng = criarGeradorDeterministico(509);
    const puffs: Array<{
      grupo: number;
      baseX: number;
      y: number;
      z: number;
      escalaX: number;
      escalaY: number;
      escalaZ: number;
      velocidade: number;
    }> = [];
    for (let g = 0; g < perfil.maxNuvens; g += 1) {
      const cx = (rng() - 0.5) * 34;
      const cy = 6.2 + rng() * 3.8;
      const cz = -10 - rng() * 14;
      const vel = 0.25 + rng() * 0.35;
      const offsets = [
        { ox: 0, oy: 0.25, sx: 1.5, sy: 0.95 },
        { ox: -1.15, oy: 0, sx: 1.1, sy: 0.75 },
        { ox: 1.15, oy: 0.02, sx: 1.15, sy: 0.78 },
        { ox: 0.2, oy: -0.1, sx: 1.35, sy: 0.68 },
      ];
      for (const off of offsets) {
        puffs.push({
          grupo: g,
          baseX: cx + off.ox,
          y: cy + off.oy,
          z: cz,
          escalaX: off.sx,
          escalaY: off.sy,
          escalaZ: 0.92,
          velocidade: vel,
        });
      }
    }
    return puffs;
  }, [perfil.maxNuvens]);

  const gotasBase = useMemo(() => {
    const rng = criarGeradorDeterministico(8080);
    return Array.from({ length: perfil.maxGotasChuva }, () => ({
      x: (rng() - 0.5) * 28,
      yInicial: rng() * 14,
      z: 3 - rng() * 16,
      escala: 0.8 + rng() * 0.5,
    }));
  }, [perfil.maxGotasChuva]);

  useEffect(() => {
    if (refRelampago.current && clima.intensidadeRelampagoMax === 0) {
      refRelampago.current.intensity = 0;
    }
  }, [clima.intensidadeRelampagoMax]);

  useFrame((estado) => {
    const tempo = reduzirMovimento ? 0 : estado.clock.getElapsedTime();

    const instNuvens = refNuvens.current;
    if (instNuvens && clima.quantidadeNuvens > 0) {
      const puffsAtivos = Math.min(totalPuffsNuvem, clima.quantidadeNuvens * 4);
      for (let i = 0; i < totalPuffsNuvem; i += 1) {
        if (i >= puffsAtivos) {
          objetoAuxiliar.scale.setScalar(0);
          objetoAuxiliar.updateMatrix();
          instNuvens.setMatrixAt(i, objetoAuxiliar.matrix);
          continue;
        }
        const puff = nuvensBase[i];
        const xCircular = ((((puff.baseX + tempo * puff.velocidade + 20) % 40) + 40) % 40) - 20;
        objetoAuxiliar.position.set(xCircular, puff.y, puff.z);
        objetoAuxiliar.rotation.set(0, 0, 0);
        objetoAuxiliar.scale.set(puff.escalaX, puff.escalaY, puff.escalaZ);
        objetoAuxiliar.updateMatrix();
        instNuvens.setMatrixAt(i, objetoAuxiliar.matrix);
      }
      instNuvens.instanceMatrix.needsUpdate = true;
    }

    const instChuva = refChuva.current;
    if (instChuva && clima.quantidadeGotas > 0) {
      for (let i = 0; i < perfil.maxGotasChuva; i += 1) {
        if (i >= clima.quantidadeGotas) {
          objetoAuxiliar.scale.setScalar(0);
          objetoAuxiliar.updateMatrix();
          instChuva.setMatrixAt(i, objetoAuxiliar.matrix);
          continue;
        }
        const gota = gotasBase[i];
        const queda = reduzirMovimento ? 0 : tempo * clima.velocidadeChuva;
        const yAtual = 13 - ((((gota.yInicial + queda) % 14) + 14) % 14);
        objetoAuxiliar.position.set(gota.x - (13 - yAtual) * 0.08, yAtual, gota.z);
        objetoAuxiliar.rotation.set(0, 0, -0.14);
        objetoAuxiliar.scale.setScalar(gota.escala);
        objetoAuxiliar.updateMatrix();
        instChuva.setMatrixAt(i, objetoAuxiliar.matrix);
      }
      instChuva.instanceMatrix.needsUpdate = true;
    }

    if (refRelampago.current) {
      if (clima.intensidadeRelampagoMax <= 0 || reduzirMovimento) {
        refRelampago.current.intensity = 0;
      } else {
        const ciclo = tempo % 4.6;
        const pulso =
          ciclo > 4.2 && ciclo < 4.35
            ? Math.sin(((ciclo - 4.2) / 0.15) * Math.PI) * clima.intensidadeRelampagoMax
            : 0;
        refRelampago.current.intensity = pulso;
      }
    }
  });

  return (
    <group>
      <instancedMesh
        ref={refNuvens}
        args={[undefined, undefined, totalPuffsNuvem]}
        visible={clima.quantidadeNuvens > 0}
      >
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          color={clima.corNuvem}
          roughness={0.95}
          metalness={0.01}
          transparent
          opacity={clima.opacidadeNuvens}
        />
      </instancedMesh>

      <instancedMesh
        ref={refChuva}
        args={[undefined, undefined, perfil.maxGotasChuva]}
        visible={clima.quantidadeGotas > 0}
      >
        <cylinderGeometry args={[0.015, 0.015, 0.72, 5]} />
        <meshBasicMaterial color="#BAE6FD" transparent opacity={0.62} depthWrite={false} />
      </instancedMesh>

      <pointLight
        ref={refRelampago}
        position={[0, 12, -8]}
        color="#E0F2FE"
        intensity={0}
        distance={45}
      />
    </group>
  );
}
