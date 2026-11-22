import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface PropriedadesCeuAtmosferico3D {
  ceuTopo: string;
  ceuMeio: string;
  ceuBase: string;
  escurecimentoClima: number;
}

interface UniformsCeu {
  uCeuTopo: THREE.IUniform<THREE.Color>;
  uCeuMeio: THREE.IUniform<THREE.Color>;
  uCeuBase: THREE.IUniform<THREE.Color>;
  uEscurecimentoClima: THREE.IUniform<number>;
}

const VERTEX_SHADER_CEU = `
  varying float vAltura;
  void main() {
    vec3 dir = normalize(position);
    vAltura = clamp((dir.y + 0.15) / 1.15, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER_CEU = `
  uniform vec3 uCeuTopo;
  uniform vec3 uCeuMeio;
  uniform vec3 uCeuBase;
  uniform float uEscurecimentoClima;
  varying float vAltura;

  void main() {
    vec3 baixoParaMeio = mix(uCeuBase, uCeuMeio, smoothstep(0.0, 0.45, vAltura));
    vec3 corFinal = mix(baixoParaMeio, uCeuTopo, smoothstep(0.42, 0.96, vAltura));
    vec3 corNuvem = vec3(0.11, 0.15, 0.24);
    corFinal = mix(corFinal, corNuvem, clamp(uEscurecimentoClima, 0.0, 0.6));
    gl_FragColor = vec4(corFinal, 1.0);
  }
`;

export function CeuAtmosferico3D({
  ceuTopo,
  ceuMeio,
  ceuBase,
  escurecimentoClima,
}: PropriedadesCeuAtmosferico3D) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  const parametrosShader = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uCeuTopo: { value: new THREE.Color('#B5DFF8') },
        uCeuMeio: { value: new THREE.Color('#E2F2F8') },
        uCeuBase: { value: new THREE.Color('#F7F1E1') },
        uEscurecimentoClima: { value: 0 },
      },
      vertexShader: VERTEX_SHADER_CEU,
      fragmentShader: FRAGMENT_SHADER_CEU,
    }),
    [],
  );

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) {
      return;
    }
    const uniforms = mat.uniforms as unknown as UniformsCeu;
    uniforms.uCeuTopo.value.set(ceuTopo);
    uniforms.uCeuMeio.value.set(ceuMeio);
    uniforms.uCeuBase.value.set(ceuBase);
    uniforms.uEscurecimentoClima.value = escurecimentoClima;
  }, [ceuTopo, ceuMeio, ceuBase, escurecimentoClima]);

  return (
    <mesh>
      <sphereGeometry args={[95, 24, 16]} />
      <shaderMaterial ref={matRef} args={[parametrosShader]} />
    </mesh>
  );
}
