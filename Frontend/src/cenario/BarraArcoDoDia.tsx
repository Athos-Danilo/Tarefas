import * as Slider from '@radix-ui/react-slider';
import { CloudRain, Moon, Pause, Play, Sun, Sunrise, Sunset } from 'lucide-react';
import { formatarMinutoParaHora } from '../astronomia/ciclo-solar';
import type { DadosFaseLunar } from '../astronomia/fase-lunar';
import { useMotorTemporal } from '../astronomia/motor-temporal';
import type { ClimaSimulado, MomentoDoDia } from '../astronomia/tipos';
import { AbasAcessiveis } from '../componentes/AbasAcessiveis';
import { Botao } from '../componentes/Botao';
import { CartaoBento } from '../componentes/CartaoBento';
import { InterruptorAcessivel } from '../componentes/InterruptorAcessivel';
import { resolverModoRenderizacao } from './detector-capacidade';

export interface PropriedadesBarraArcoDoDia {
  minuto: number;
  momentoDoDia: MomentoDoDia;
  nomeMomento: string;
  faseLunar: DadosFaseLunar;
  reduzirMovimento: boolean;
  suporteWebGL: boolean;
}

const OPCOES_MOMENTO: ReadonlyArray<{
  id: MomentoDoDia;
  rotulo: string;
  Icone: typeof Sunrise;
}> = [
  { id: 'manha', rotulo: 'Manhã', Icone: Sunrise },
  { id: 'tarde', rotulo: 'Tarde', Icone: Sun },
  { id: 'crepusculo', rotulo: 'Crepúsculo', Icone: Sunset },
  { id: 'noite', rotulo: 'Noite', Icone: Moon },
];

const OPCOES_CLIMA: ReadonlyArray<{ id: ClimaSimulado; rotulo: string }> = [
  { id: 'automatico', rotulo: 'Automático' },
  { id: 'limpo', rotulo: 'Limpo' },
  { id: 'parcialmente_nublado', rotulo: 'Parcialmente nublado' },
  { id: 'nublado', rotulo: 'Nublado' },
  { id: 'chuvoso', rotulo: 'Chuvoso' },
  { id: 'tempestade', rotulo: 'Tempestade' },
];

export function BarraArcoDoDia({
  minuto,
  momentoDoDia,
  nomeMomento,
  faseLunar,
  reduzirMovimento,
  suporteWebGL,
}: PropriedadesBarraArcoDoDia) {
  const modoTemporal = useMotorTemporal((s) => s.modoTemporal);
  const timelapseAtivo = useMotorTemporal((s) => s.timelapseAtivo);
  const climaSimulado = useMotorTemporal((s) => s.climaSimulado);
  const qualidade3D = useMotorTemporal((s) => s.qualidade3D);
  const definirMinutoSimulado = useMotorTemporal((s) => s.definirMinutoSimulado);
  const selecionarMomento = useMotorTemporal((s) => s.selecionarMomento);
  const ativarRelogioReal = useMotorTemporal((s) => s.ativarRelogioReal);
  const alternarTimelapse = useMotorTemporal((s) => s.alternarTimelapse);
  const definirClimaSimulado = useMotorTemporal((s) => s.definirClimaSimulado);
  const definirQualidade3D = useMotorTemporal((s) => s.definirQualidade3D);
  const definirMovimentoReduzido = useMotorTemporal((s) => s.definirMovimentoReduzido);

  const resultadoModo = resolverModoRenderizacao({
    qualidadePreferida: qualidade3D,
    movimentoReduzido: reduzirMovimento,
    suporteWebGL,
  });

  const painelSimulador = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos dos momentos do dia">
        {OPCOES_MOMENTO.map(({ id, rotulo, Icone }) => (
          <Botao
            key={id}
            variante={momentoDoDia === id ? 'primario' : 'secundario'}
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            onClick={() => selecionarMomento(id)}
          >
            <Icone className="h-3.5 w-3.5" aria-hidden="true" />
            {rotulo}
          </Botao>
        ))}

        <Botao
          variante={timelapseAtivo ? 'primario' : 'secundario'}
          tamanho="sm"
          reduzirMovimento={reduzirMovimento}
          onClick={() => alternarTimelapse()}
        >
          {timelapseAtivo ? (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {timelapseAtivo ? 'Pausar 24h' : 'Simular 24h'}
        </Botao>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--texto-sec)]">
          <span>Arco solar contínuo (00:00 até 23:59)</span>
          <span className="numero-tabular font-semibold text-[var(--texto)]">
            {formatarMinutoParaHora(minuto)}
          </span>
        </div>
        <Slider.Root
          value={[minuto]}
          min={0}
          max={1439}
          step={5}
          onValueChange={(valores) => {
            if (typeof valores[0] === 'number') {
              definirMinutoSimulado(valores[0]);
            }
          }}
          className="relative flex h-6 w-full touch-none items-center select-none"
        >
          <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[var(--superficie-alt)] border border-[var(--borda)]">
            <Slider.Range className="absolute h-full bg-[var(--primaria)]" />
          </Slider.Track>
          <Slider.Thumb
            aria-label="Selecionar horário no arco do dia"
            className="block h-5 w-5 cursor-pointer rounded-full border-2 border-[var(--primaria-texto)] bg-[var(--primaria)] shadow"
          />
        </Slider.Root>
      </div>
    </div>
  );

  return (
    <CartaoBento
      aria-label="Controle temporal e climatico do horizonte"
      className="w-full space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borda)] pb-3">
        <div>
          <span className="numero-tabular text-xs font-semibold uppercase tracking-wide text-[var(--primaria)]">
            {nomeMomento}
          </span>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className="numero-tabular text-2xl font-semibold text-[var(--texto)]">
              {formatarMinutoParaHora(minuto)}
            </span>
            <span className="text-xs text-[var(--texto-sec)]">
              {faseLunar.nome} ({faseLunar.percentualIluminado}% iluminada, Hemisfério Sul)
            </span>
          </div>
        </div>

        <span className="numero-tabular rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1 text-xs font-semibold text-[var(--texto)]">
          Renderização: {resultadoModo.modo === '3d' ? 'WebGL 3D' : 'Fallback 2D'}
        </span>
      </div>

      <AbasAcessiveis
        rotuloGrupo="Modo temporal"
        valorAtivo={modoTemporal}
        aoMudarValor={(valor) => {
          if (valor === 'relogio_real') {
            ativarRelogioReal();
          } else {
            definirMinutoSimulado(minuto);
          }
        }}
        itens={[
          {
            valor: 'relogio_real',
            rotulo: 'Relógio Real',
            conteudo: (
              <div className="space-y-3">
                <p className="text-xs text-[var(--texto-sec)]">
                  Sincronizado com o horário local do dispositivo. Escolha um atalho abaixo para
                  experimentar o Modo Simulador:
                </p>
                {painelSimulador}
              </div>
            ),
          },
          {
            valor: 'simulador',
            rotulo: 'Simulador 24h',
            conteudo: painelSimulador,
          },
        ]}
      />

      <div className="space-y-2 border-t border-[var(--borda)] pt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--texto)]">
          <CloudRain className="h-3.5 w-3.5 text-[var(--primaria)]" aria-hidden="true" />
          <span>Seletor de clima simulado</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Estados climaticos">
          {OPCOES_CLIMA.map((opcao) => (
            <Botao
              key={opcao.id}
              variante={climaSimulado === opcao.id ? 'primario' : 'secundario'}
              tamanho="sm"
              reduzirMovimento={reduzirMovimento}
              onClick={() => definirClimaSimulado(opcao.id)}
            >
              {opcao.rotulo}
            </Botao>
          ))}
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <InterruptorAcessivel
          id="interruptor-modo-desempenho"
          rotulo="Modo Desempenho (2D)"
          descricao="Prioriza paisagem SVG leve sem exigir WebGL."
          ativado={qualidade3D === 'desempenho_2d'}
          aoAlternar={(ativado) => definirQualidade3D(ativado ? 'desempenho_2d' : 'auto')}
        />
        <InterruptorAcessivel
          id="interruptor-reduzir-movimento"
          rotulo="Reduzir movimento"
          descricao="Desativa animações decorativas e clarões atmosféricos."
          ativado={reduzirMovimento}
          aoAlternar={(ativado) => definirMovimentoReduzido(ativado)}
        />
      </div>
    </CartaoBento>
  );
}
