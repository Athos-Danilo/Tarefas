import { gerarCaminhoLuaSvg, type DadosFaseLunar } from '../astronomia/fase-lunar';

export interface PropriedadesLuaFaseSvg {
  dadosFaseLunar: DadosFaseLunar;
  cx: number;
  cy: number;
  raio?: number;
}

export function LuaFaseSvg({ dadosFaseLunar, cx, cy, raio = 22 }: PropriedadesLuaFaseSvg) {
  const caminhoIluminado = gerarCaminhoLuaSvg(
    dadosFaseLunar.fracaoCiclo,
    raio,
    dadosFaseLunar.hemisferio,
  );
  const rotuloHemisferio =
    dadosFaseLunar.hemisferio === 'sul' ? 'Hemisfério Sul' : 'Hemisfério Norte';
  const descricaoAcessivel = `${dadosFaseLunar.nome} com ${dadosFaseLunar.percentualIluminado}% iluminado (${rotuloHemisferio})`;
  const caixa = raio * 2 + 8;
  const inicio = -(raio + 4);

  return (
    <svg
      x={cx - raio - 4}
      y={cy - raio - 4}
      width={caixa}
      height={caixa}
      viewBox={`${inicio} ${inicio} ${caixa} ${caixa}`}
      role="img"
      aria-label={descricaoAcessivel}
    >
      <title>{descricaoAcessivel}</title>
      <circle
        cx={0}
        cy={0}
        r={raio}
        fill="#1D2A4A"
        fillOpacity={0.82}
        stroke="#F7E8B5"
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      {caminhoIluminado ? <path d={caminhoIluminado} fill="#F7E8B5" /> : null}
    </svg>
  );
}
