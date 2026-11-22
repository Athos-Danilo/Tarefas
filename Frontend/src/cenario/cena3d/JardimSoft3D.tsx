import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { criarGeradorDeterministico, type PerfilDesempenho3D } from '../logica-cena-3d';

export interface PropriedadesJardimSoft3D {
  colina1: string;
  colina2: string;
  colina3: string;
  escalaFlorescimento: number;
  opacidadeVagalumes: number;
  reduzirMovimento: boolean;
  perfil: PerfilDesempenho3D;
}

function criarGeometriaColina(
  largura: number,
  profundidade: number,
  segmentosX: number,
  amplitude: number,
  deslocamentoFase: number,
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(largura, profundidade, segmentosX, 16);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y =
      Math.sin(x * 0.19 + deslocamentoFase) * amplitude +
      Math.cos(z * 0.25 + deslocamentoFase * 0.5) * (amplitude * 0.45);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  return geo;
}

const CORES_FLORES = ['#FFD166', '#F4A261', '#F7E8B5', '#FF8E61', '#7BE3D0'];

export function JardimSoft3D({
  colina1,
  colina2,
  colina3,
  escalaFlorescimento,
  opacidadeVagalumes,
  reduzirMovimento,
  perfil,
}: PropriedadesJardimSoft3D) {
  const refArbustos = useRef<THREE.InstancedMesh | null>(null);
  const refFlores = useRef<THREE.InstancedMesh | null>(null);
  const refVagalumes = useRef<THREE.InstancedMesh | null>(null);
  const objetoAuxiliar = useMemo(() => new THREE.Object3D(), []);

  const geoColinaFrente = useMemo(
    () => criarGeometriaColina(56, 20, perfil.segmentosTerreno, 0.72, 0.4),
    [perfil.segmentosTerreno],
  );
  const geoColinaMedia = useMemo(
    () => criarGeometriaColina(72, 22, perfil.segmentosTerreno, 1.35, 1.8),
    [perfil.segmentosTerreno],
  );
  const geoColinaFundo = useMemo(
    () => criarGeometriaColina(92, 26, perfil.segmentosTerreno, 2.25, 3.1),
    [perfil.segmentosTerreno],
  );

  const subdivisaoArbusto = perfil.perfil === 'desktop_riqueza_maxima' ? 2 : 1;

  const dadosArbustos = useMemo(() => {
    const rng = criarGeradorDeterministico(701);
    return Array.from({ length: perfil.quantidadeArbustos }, () => ({
      x: (rng() - 0.5) * 32,
      y: -0.7 + rng() * 0.45,
      z: -1 - rng() * 14,
      escala: 0.65 + rng() * 0.9,
      rotY: rng() * Math.PI * 2,
    }));
  }, [perfil.quantidadeArbustos]);

  const dadosFlores = useMemo(() => {
    const rng = criarGeradorDeterministico(919);
    return Array.from({ length: perfil.quantidadeFlores }, (_, indice) => ({
      x: (rng() - 0.5) * 28,
      y: -0.25 + rng() * 0.4,
      z: 0.2 - rng() * 11,
      escalaBase: 0.7 + rng() * 0.65,
      cor: new THREE.Color(CORES_FLORES[indice % CORES_FLORES.length]),
    }));
  }, [perfil.quantidadeFlores]);

  const dadosVagalumes = useMemo(() => {
    const rng = criarGeradorDeterministico(2026);
    return Array.from({ length: perfil.quantidadeVagalumes }, () => ({
      x: (rng() - 0.5) * 24,
      y: 0.35 + rng() * 3.2,
      z: 1 - rng() * 11,
      fase: rng() * Math.PI * 2,
      velocidade: 0.7 + rng() * 0.9,
    }));
  }, [perfil.quantidadeVagalumes]);

  useEffect(() => {
    const inst = refArbustos.current;
    if (!inst) {
      return;
    }
    dadosArbustos.forEach((item, i) => {
      objetoAuxiliar.position.set(item.x, item.y, item.z);
      objetoAuxiliar.rotation.set(0, item.rotY, 0);
      objetoAuxiliar.scale.setScalar(item.escala);
      objetoAuxiliar.updateMatrix();
      inst.setMatrixAt(i, objetoAuxiliar.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  }, [dadosArbustos, objetoAuxiliar]);

  useEffect(() => {
    const inst = refFlores.current;
    if (!inst) {
      return;
    }
    dadosFlores.forEach((item, i) => {
      objetoAuxiliar.position.set(item.x, item.y, item.z);
      objetoAuxiliar.rotation.set(0, 0, 0);
      objetoAuxiliar.scale.setScalar(item.escalaBase * escalaFlorescimento);
      objetoAuxiliar.updateMatrix();
      inst.setMatrixAt(i, objetoAuxiliar.matrix);
      inst.setColorAt(i, item.cor);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) {
      inst.instanceColor.needsUpdate = true;
    }
  }, [dadosFlores, escalaFlorescimento, objetoAuxiliar]);

  useFrame((estado) => {
    const inst = refVagalumes.current;
    if (!inst || opacidadeVagalumes <= 0.01) {
      return;
    }
    const tempo = reduzirMovimento ? 0 : estado.clock.getElapsedTime();
    dadosVagalumes.forEach((item, i) => {
      const dx = Math.sin(tempo * item.velocidade + item.fase) * 0.35;
      const dy = Math.cos(tempo * item.velocidade * 1.2 + item.fase) * 0.25;
      objetoAuxiliar.position.set(item.x + dx, item.y + dy, item.z);
      objetoAuxiliar.scale.setScalar(1);
      objetoAuxiliar.updateMatrix();
      inst.setMatrixAt(i, objetoAuxiliar.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      geoColinaFrente.dispose();
      geoColinaMedia.dispose();
      geoColinaFundo.dispose();
    };
  }, [geoColinaFrente, geoColinaMedia, geoColinaFundo]);

  return (
    <group>
      <mesh
        geometry={geoColinaFundo}
        position={[0, -1.6, -20]}
        receiveShadow={perfil.sombrasAtivas}
      >
        <meshStandardMaterial color={colina3} roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh
        geometry={geoColinaMedia}
        position={[0, -1.5, -10]}
        receiveShadow={perfil.sombrasAtivas}
      >
        <meshStandardMaterial color={colina2} roughness={0.93} metalness={0.02} />
      </mesh>
      <mesh
        geometry={geoColinaFrente}
        position={[0, -1.45, -1.5]}
        receiveShadow={perfil.sombrasAtivas}
      >
        <meshStandardMaterial color={colina1} roughness={0.92} metalness={0.02} />
      </mesh>

      <instancedMesh
        ref={refArbustos}
        args={[undefined, undefined, perfil.quantidadeArbustos]}
        castShadow={perfil.sombrasAtivas}
        receiveShadow={perfil.sombrasAtivas}
      >
        <icosahedronGeometry args={[0.62, subdivisaoArbusto]} />
        <meshStandardMaterial color={colina1} roughness={0.9} metalness={0.02} />
      </instancedMesh>

      <instancedMesh ref={refFlores} args={[undefined, undefined, perfil.quantidadeFlores]}>
        <icosahedronGeometry args={[0.18, 1]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.72} metalness={0.02} />
      </instancedMesh>

      <instancedMesh
        ref={refVagalumes}
        args={[undefined, undefined, perfil.quantidadeVagalumes]}
        visible={opacidadeVagalumes > 0.01}
      >
        <octahedronGeometry args={[0.065, 0]} />
        <meshBasicMaterial
          color="#FFE082"
          transparent
          opacity={opacidadeVagalumes}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
