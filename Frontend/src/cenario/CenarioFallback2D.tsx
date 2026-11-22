import type { PosicaoAstros } from '../astronomia/ciclo-solar';
import type { DadosFaseLunar } from '../astronomia/fase-lunar';
import type { EstadoCromatico24h } from '../astronomia/sistema-cromatico';
import type { EstadoClimatico } from '../astronomia/tipos';
import { LuaFaseSvg } from './LuaFaseSvg';

export interface PropriedadesCenarioFallback2D {
  cromatico: EstadoCromatico24h;
  astros: PosicaoAstros;
  faseLunar: DadosFaseLunar;
  estadoClimatico: EstadoClimatico;
  reduzirMovimento: boolean;
}

const OPACIDADE_COBERTURA_CLIMA: Record<EstadoClimatico, number> = {
  limpo: 0,
  parcialmente_nublado: 0.08,
  nublado: 0.22,
  chuvoso: 0.3,
  tempestade: 0.42,
};

const NUVENS_BASE = [
  { cx: 145, cy: 76, escala: 1.0 },
  { cx: 410, cy: 58, escala: 1.15 },
  { cx: 655, cy: 84, escala: 0.95 },
  { cx: 280, cy: 102, escala: 0.85 },
  { cx: 545, cy: 96, escala: 1.05 },
];

const GOTAS_CHUVA = [
  { x: 95, y: 88, len: 18 },
  { x: 155, y: 120, len: 20 },
  { x: 225, y: 94, len: 16 },
  { x: 300, y: 132, len: 22 },
  { x: 380, y: 86, len: 18 },
  { x: 455, y: 118, len: 21 },
  { x: 525, y: 96, len: 19 },
  { x: 605, y: 128, len: 17 },
  { x: 685, y: 90, len: 20 },
  { x: 745, y: 130, len: 18 },
];

export function CenarioFallback2D({
  cromatico,
  astros,
  faseLunar,
  estadoClimatico,
  reduzirMovimento,
}: PropriedadesCenarioFallback2D) {
  const temNuvens = estadoClimatico !== 'limpo';
  const temChuva = estadoClimatico === 'chuvoso' || estadoClimatico === 'tempestade';
  const flashesAtivos = estadoClimatico === 'tempestade' && !reduzirMovimento;
  const quantidadeNuvens = estadoClimatico === 'parcialmente_nublado' ? 2 : 5;
  const opacidadeEscurecimento = OPACIDADE_COBERTURA_CLIMA[estadoClimatico];

  return (
    <div
      data-testid="cenario-fallback-2d"
      data-modo-renderizacao="fallback_2d"
      data-estado-climatico={estadoClimatico}
      data-sol-visivel={astros.solVisivel ? 'true' : 'false'}
      data-lua-visivel={astros.luaVisivel ? 'true' : 'false'}
      data-flashes-ativos={flashesAtivos ? 'true' : 'false'}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      <svg
        viewBox="0 0 800 320"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden="false"
      >
        <defs>
          <linearGradient id="ceu-gradiente-24h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cromatico.ceuTopo} />
            <stop offset="56%" stopColor={cromatico.ceuMeio} />
            <stop offset="100%" stopColor={cromatico.ceuBase} />
          </linearGradient>
          <radialGradient id="halo-astro-24h" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={cromatico.astro} stopOpacity="0.65" />
            <stop offset="100%" stopColor={cromatico.astro} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="320" fill="url(#ceu-gradiente-24h)" />

        {opacidadeEscurecimento > 0 ? (
          <rect width="800" height="320" fill="#0F172A" fillOpacity={opacidadeEscurecimento} />
        ) : null}

        <g opacity={cromatico.opacidadeEstrelas}>
          <circle cx="84" cy="48" r="1.8" fill="#FFF7D6" />
          <circle cx="158" cy="74" r="2.2" fill="#FFF7D6" />
          <circle cx="240" cy="42" r="2.0" fill="#FFF7D6" />
          <circle cx="332" cy="68" r="2.1" fill="#FFF7D6" />
          <circle cx="445" cy="36" r="1.9" fill="#FFF7D6" />
          <circle cx="536" cy="58" r="2.4" fill="#FFF7D6" />
          <circle cx="628" cy="44" r="2.0" fill="#FFF7D6" />
          <circle cx="715" cy="70" r="2.2" fill="#FFF7D6" />
          <polyline
            points="158,74 240,42 332,68"
            fill="none"
            stroke="#F5D076"
            strokeOpacity="0.7"
            strokeWidth="1.2"
          />
          <polyline
            points="536,58 628,44 715,70"
            fill="none"
            stroke="#6EE7D8"
            strokeOpacity="0.7"
            strokeWidth="1.2"
          />
        </g>

        <path
          d="M 70 224 Q 400 -24 730 224"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.2"
          strokeDasharray="4 5"
        />

        {astros.solVisivel ? (
          <g>
            <circle cx={astros.solX} cy={astros.solY} r={54} fill="url(#halo-astro-24h)" />
            <circle cx={astros.solX} cy={astros.solY} r={22} fill={cromatico.astro} />
          </g>
        ) : null}

        {astros.luaVisivel ? (
          <g>
            <circle cx={astros.luaX} cy={astros.luaY} r={44} fill="url(#halo-astro-24h)" />
            <LuaFaseSvg dadosFaseLunar={faseLunar} cx={astros.luaX} cy={astros.luaY} raio={20} />
          </g>
        ) : null}

        {temNuvens ? (
          <g
            data-testid="camada-nuvens-2d"
            opacity={estadoClimatico === 'parcialmente_nublado' ? 0.72 : 0.9}
          >
            {NUVENS_BASE.slice(0, quantidadeNuvens).map((nuvem, indice) => (
              <g
                key={indice}
                transform={`translate(${nuvem.cx}, ${nuvem.cy}) scale(${nuvem.escala})`}
                fill={estadoClimatico === 'tempestade' ? '#64748B' : '#F1F5F9'}
              >
                <ellipse cx="0" cy="0" rx="34" ry="15" />
                <ellipse cx="-18" cy="4" rx="22" ry="12" />
                <ellipse cx="20" cy="4" rx="24" ry="12" />
              </g>
            ))}
          </g>
        ) : null}

        {temChuva ? (
          <g
            data-testid="camada-chuva-2d"
            stroke="#BAE6FD"
            strokeOpacity={estadoClimatico === 'tempestade' ? 0.78 : 0.55}
            strokeWidth={1.6}
            strokeLinecap="round"
          >
            {GOTAS_CHUVA.map((gota, indice) => (
              <line key={indice} x1={gota.x} y1={gota.y} x2={gota.x - 5} y2={gota.y + gota.len} />
            ))}
          </g>
        ) : null}

        {flashesAtivos ? (
          <path
            data-testid="clarao-tempestade-2d"
            d="M 520 82 L 502 126 L 522 126 L 500 172"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        ) : null}

        <path d="M0,224 Q190,178 400,218 T800,202 L800,320 L0,320 Z" fill={cromatico.colina3} />
        <path d="M0,248 Q260,214 520,244 T800,228 L800,320 L0,320 Z" fill={cromatico.colina2} />
        <path d="M0,270 Q300,246 580,268 T800,256 L800,320 L0,320 Z" fill={cromatico.colina1} />
      </svg>
    </div>
  );
}
