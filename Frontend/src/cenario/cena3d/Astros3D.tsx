import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  criarGeradorDeterministico,
  type ParametrosCena3D,
  type PerfilDesempenho3D,
} from '../logica-cena-3d';

export interface PropriedadesAstros3D {
  parametros: ParametrosCena3D;
  solVisivel: boolean;
  luaVisivel: boolean;
  opacidadeEstrelas: number;
  corAstro: string;
  perfil: PerfilDesempenho3D;
}

interface UniformsLua {
  uVetorLuz: THREE.IUniform<THREE.Vector3>;
  uCorIluminada: THREE.IUniform<THREE.Color>;
  uCorSombra: THREE.IUniform<THREE.Color>;
}

const VERTEX_SHADER_LUA = `
  varying vec3 vNormalLocal;
  varying vec3 vPosicaoLocal;
  void main() {
    vNormalLocal = normalize(normal);
    vPosicaoLocal = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER_LUA = `
  uniform vec3 uVetorLuz;
  uniform vec3 uCorIluminada;
  uniform vec3 uCorSombra;
  varying vec3 vNormalLocal;
  varying vec3 vPosicaoLocal;

  void main() {
    float difusa = smoothstep(-0.04, 0.14, dot(normalize(vNormalLocal), normalize(uVetorLuz)));
    float mares = sin(vPosicaoLocal.x * 6.0 + 1.1) * cos(vPosicaoLocal.y * 5.0 - 0.6) * 0.08;
    float luzCinerea = 0.14;
    float fator = clamp(mix(luzCinerea, 1.0, difusa) + mares * 0.25, 0.08, 1.0);
    vec3 cor = mix(uCorSombra, uCorIluminada, fator);
    gl_FragColor = vec4(cor, 1.0);
  }
`;

export function Astros3D({
  parametros,
  solVisivel,
  luaVisivel,
  opacidadeEstrelas,
  corAstro,
  perfil,
}: PropriedadesAstros3D) {
  const matLuaRef = useRef<THREE.ShaderMaterial | null>(null);

  const parametrosShaderLua = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      uniforms: {
        uVetorLuz: { value: new THREE.Vector3(-1, 0, 0) },
        uCorIluminada: { value: new THREE.Color('#F7E8B5') },
        uCorSombra: { value: new THREE.Color('#182342') },
      },
      vertexShader: VERTEX_SHADER_LUA,
      fragmentShader: FRAGMENT_SHADER_LUA,
    }),
    [],
  );

  const geometriaEstrelas = useMemo(() => {
    const rng = criarGeradorDeterministico(1337);
    const posicoes = new Float32Array(perfil.quantidadeEstrelas * 3);
    for (let i = 0; i < perfil.quantidadeEstrelas; i += 1) {
      const idx = i * 3;
      posicoes[idx] = (rng() - 0.5) * 90;
      posicoes[idx + 1] = 3 + rng() * 34;
      posicoes[idx + 2] = -24 - rng() * 30;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
    return geo;
  }, [perfil.quantidadeEstrelas]);

  const geometriaConstelacao = useMemo(() => {
    const vertices = new Float32Array([
      -12, 10.5, -28, -8.5, 13.0, -28, -8.5, 13.0, -28, -5.0, 11.2, -28, -5.0, 11.2, -28, -2.5,
      13.8, -28, 5.5, 11.4, -29, 9.2, 13.6, -29, 9.2, 13.6, -29, 13.0, 10.8, -29, 9.2, 13.6, -29,
      10.5, 8.2, -29,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geo;
  }, []);

  useEffect(() => {
    const mat = matLuaRef.current;
    if (!mat) {
      return;
    }
    const uniforms = mat.uniforms as unknown as UniformsLua;
    const [vx, vy, vz] = parametros.vetorLuzLunar;
    uniforms.uVetorLuz.value.set(vx, vy, vz);
  }, [parametros.vetorLuzLunar]);

  useEffect(() => {
    return () => {
      geometriaEstrelas.dispose();
      geometriaConstelacao.dispose();
    };
  }, [geometriaEstrelas, geometriaConstelacao]);

  const opacidadeEstrelasFinal = opacidadeEstrelas * (1 - parametros.clima.escurecimentoCeu * 0.7);
  const opacidadeConstelacoesFinal =
    parametros.brilhoConstelacoes * (1 - parametros.clima.escurecimentoCeu * 0.65);

  return (
    <group>
      <ambientLight
        color={parametros.corLuzAmbiente}
        intensity={parametros.intensidadeLuzAmbiente}
      />
      <hemisphereLight
        args={[
          parametros.corHemisferioCeu,
          parametros.corHemisferioSolo,
          parametros.intensidadeHemisferio,
        ]}
      />
      <directionalLight
        position={solVisivel ? parametros.posicaoSol : parametros.posicaoLua}
        color={parametros.corLuzDirecional}
        intensity={parametros.intensidadeLuzDirecional}
        castShadow={perfil.sombrasAtivas}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {solVisivel ? (
        <group position={parametros.posicaoSol}>
          <mesh>
            <sphereGeometry args={[2.7, 20, 16]} />
            <meshBasicMaterial color={corAstro} transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.75, 28, 20]} />
            <meshBasicMaterial color={corAstro} />
          </mesh>
        </group>
      ) : null}

      {luaVisivel ? (
        <group position={parametros.posicaoLua}>
          <mesh>
            <sphereGeometry args={[2.7, 20, 16]} />
            <meshBasicMaterial color="#F7E8B5" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.65, 32, 24]} />
            <shaderMaterial ref={matLuaRef} args={[parametrosShaderLua]} />
          </mesh>
        </group>
      ) : null}

      <points geometry={geometriaEstrelas}>
        <pointsMaterial
          color="#FFF7D6"
          size={0.28}
          transparent
          opacity={opacidadeEstrelasFinal}
          depthWrite={false}
        />
      </points>

      <lineSegments geometry={geometriaConstelacao}>
        <lineBasicMaterial
          color="#F5D076"
          transparent
          opacity={opacidadeConstelacoesFinal}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
