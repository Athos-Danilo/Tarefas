import { MoonStar, Sun } from 'lucide-react';
import type { DadosFaseLunar } from '../../astronomia/fase-lunar';
import {
  calcularProgressoTemporizador,
  formatarCronometroSegundos,
  type TemaTemporizadorFoco,
} from './logica-foco';

export interface PropriedadesTemporizadorSolarLunar {
  tema: TemaTemporizadorFoco;
  faseLunar: DadosFaseLunar;
  duracaoPlanejadaSeg: number;
  segundosRestantes: number;
  emExecucao: boolean;
  pausado: boolean;
  reduzirMovimento: boolean;
}

export function TemporizadorSolarLunar({
  tema,
  faseLunar,
  duracaoPlanejadaSeg,
  segundosRestantes,
  emExecucao,
  pausado,
  reduzirMovimento,
}: PropriedadesTemporizadorSolarLunar) {
  const raio = 96;
  const circunferencia = 2 * Math.PI * raio;
  const progresso = calcularProgressoTemporizador(duracaoPlanejadaSeg, segundosRestantes);
  const deslocamentoTraco = circunferencia * (1 - progresso);
  const ehLunar = tema === 'lunar';

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            ehLunar
              ? 'bg-indigo-500/20 text-indigo-200'
              : 'bg-amber-400/20 text-amber-800 dark:text-amber-200'
          }`}
        >
          {ehLunar ? (
            <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Sun className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{ehLunar ? 'Temporizador lunar' : 'Temporizador solar'}</span>
        </span>
        {ehLunar && (
          <span className="rounded-full bg-[var(--superficie-alt)] px-2.5 py-1 text-xs text-[var(--texto-sec)]">
            {faseLunar.nome}
          </span>
        )}
      </div>

      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="gradiente-anel-foco" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={ehLunar ? '#93C5FD' : '#F59E0B'} />
              <stop offset="100%" stopColor={ehLunar ? '#C084FC' : '#FDE047'} />
            </linearGradient>
          </defs>
          <circle
            cx="110"
            cy="110"
            r={raio}
            fill="none"
            stroke={ehLunar ? 'rgba(148, 163, 184, 0.22)' : 'rgba(245, 158, 11, 0.22)'}
            strokeWidth="10"
          />
          <circle
            cx="110"
            cy="110"
            r={raio}
            fill="none"
            stroke="url(#gradiente-anel-foco)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={deslocamentoTraco}
            style={reduzirMovimento ? undefined : { transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <time
            role="timer"
            aria-live="off"
            aria-label="Tempo restante da sessão de foco"
            className="font-['JetBrains_Mono',monospace] text-4xl font-bold tracking-tight text-[var(--texto)] tabular-nums"
          >
            {formatarCronometroSegundos(segundosRestantes)}
          </time>
          <span className="mt-1 text-xs font-medium text-[var(--texto-sec)]">
            {emExecucao
              ? pausado
                ? 'Pausado localmente'
                : 'Em concentração'
              : 'Pronto para iniciar'}
          </span>
        </div>
      </div>
    </div>
  );
}
