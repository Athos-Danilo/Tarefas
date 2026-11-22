import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  MapPinOff,
  Search,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatarMinutoParaHora } from '../../astronomia/ciclo-solar';
import type { DadosFaseLunar } from '../../astronomia/fase-lunar';
import { useMotorTemporal } from '../../astronomia/motor-temporal';
import type { EstadoClimatico } from '../../astronomia/tipos';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import type {
  EntradaConsentimentoClima,
  ServicoJornadaFrontend,
  SugestaoCidadeClima,
} from '../../servicos/tipos-jornada';
import { arredondarCoordenadaAproximada } from './logica-jornada';

export interface PropriedadesMiniCardClimaOptIn {
  minuto: number;
  nomeMomento: string;
  faseLunar: DadosFaseLunar;
  servico: ServicoJornadaFrontend;
  reduzirMovimento: boolean;
}

function IconeClima({ estado }: { estado: EstadoClimatico }) {
  switch (estado) {
    case 'limpo':
      return <Sun className="h-5 w-5 text-[var(--secundaria)]" aria-hidden="true" />;
    case 'parcialmente_nublado':
      return <CloudSun className="h-5 w-5 text-[var(--secundaria)]" aria-hidden="true" />;
    case 'nublado':
      return <Cloud className="h-5 w-5 text-[var(--texto-sec)]" aria-hidden="true" />;
    case 'chuvoso':
      return <CloudRain className="h-5 w-5 text-[var(--primaria)]" aria-hidden="true" />;
    case 'tempestade':
      return <CloudLightning className="h-5 w-5 text-[var(--erro)]" aria-hidden="true" />;
  }
}

export function MiniCardClimaOptIn({
  minuto,
  nomeMomento,
  faseLunar,
  servico,
  reduzirMovimento,
}: PropriedadesMiniCardClimaOptIn) {
  const queryClient = useQueryClient();
  const definirEstadoClimaticoReal = useMotorTemporal((s) => s.definirEstadoClimaticoReal);

  const [consultaCidade, setConsultaCidade] = useState('');
  const [sugestoes, setSugestoes] = useState<SugestaoCidadeClima[]>([]);
  const [buscandoCidades, setBuscandoCidades] = useState(false);
  const [exibirBuscaManual, setExibirBuscaManual] = useState(false);
  const [erroClima, setErroClima] = useState<string | null>(null);

  const consultaClima = useQuery({
    queryKey: ['clima-atual'],
    queryFn: () => servico.consultarClimaAtual(),
  });

  useEffect(() => {
    if (!consultaClima.data) {
      return;
    }
    if (consultaClima.data.autorizado) {
      definirEstadoClimaticoReal(consultaClima.data.clima.estadoClimatico);
    } else {
      definirEstadoClimaticoReal('limpo');
    }
  }, [consultaClima.data, definirEstadoClimaticoReal]);

  const mutacaoConsentimento = useMutation({
    mutationFn: (entrada: EntradaConsentimentoClima) =>
      servico.atualizarConsentimentoClima(entrada),
    onSuccess: async (resultado) => {
      setErroClima(null);
      setSugestoes([]);
      setExibirBuscaManual(false);
      definirEstadoClimaticoReal(resultado.habilitado ? resultado.estadoClimatico : 'limpo');
      if (!resultado.habilitado) {
        queryClient.setQueryData(['clima-atual'], { autorizado: false, clima: null });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['clima-atual'] });
    },
    onError: () => {
      setErroClima('Não foi possível salvar a preferência de clima agora.');
    },
  });

  const lidarBuscarCidade = async () => {
    const termo = consultaCidade.trim();
    if (termo.length < 2) {
      setErroClima('Digite ao menos 2 letras para buscar uma cidade.');
      return;
    }
    setErroClima(null);
    setBuscandoCidades(true);
    try {
      const itens = await servico.buscarCidades(termo);
      setSugestoes(itens);
      if (itens.length === 0) {
        setErroClima('Nenhuma cidade encontrada para essa busca.');
      }
    } catch {
      setErroClima('Falha ao consultar sugestões de cidades.');
    } finally {
      setBuscandoCidades(false);
    }
  };

  const lidarGeolocalizacao = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErroClima('Geolocalização indisponível neste navegador. Use a busca por cidade.');
      return;
    }
    setErroClima(null);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const latitudeAprox = arredondarCoordenadaAproximada(posicao.coords.latitude);
        const longitudeAprox = arredondarCoordenadaAproximada(posicao.coords.longitude);
        mutacaoConsentimento.mutate({
          habilitado: true,
          modoLocalizacao: 'geolocalizacao',
          cidade: null,
          uf: null,
          latitudeAprox,
          longitudeAprox,
        });
      },
      () => {
        setErroClima(
          'Permissão de localização recusada. Você ainda pode escolher sua cidade manualmente.',
        );
      },
      { maximumAge: 600_000, timeout: 8_000 },
    );
  };

  const estadoClima = consultaClima.data;
  const autorizado = Boolean(estadoClima?.autorizado);

  return (
    <CartaoBento aria-label="Horário local e clima opt-in" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-2xl font-bold text-[var(--texto)]">
            {formatarMinutoParaHora(minuto)}
          </p>
          <p className="text-xs font-medium text-[var(--texto-sec)]">
            {nomeMomento} · {faseLunar.nome} ({faseLunar.percentualIluminado}% iluminada)
          </p>
        </div>

        {estadoClima?.autorizado ? (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2">
            <IconeClima estado={estadoClima.clima.estadoClimatico} />
            <div>
              <p className="text-sm font-bold text-[var(--texto)]">
                {estadoClima.clima.temperaturaC.toFixed(1)}°C · {estadoClima.clima.descricao}
              </p>
              <p className="text-xs text-[var(--texto-sec)]">
                {estadoClima.clima.cidade ?? 'Localização aproximada'}
                {estadoClima.clima.uf ? `, ${estadoClima.clima.uf}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2 text-xs text-[var(--texto-sec)]">
            <MapPinOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Clima local desligado por privacidade.</span>
          </div>
        )}
      </div>

      {autorizado ? (
        <div className="flex flex-wrap items-center gap-2">
          <Botao
            variante="secundario"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            onClick={() => setExibirBuscaManual((atual) => !atual)}
          >
            {exibirBuscaManual ? 'Fechar troca de cidade' : 'Trocar cidade'}
          </Botao>
          <Botao
            variante="fantasma"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            disabled={mutacaoConsentimento.isPending}
            onClick={() => mutacaoConsentimento.mutate({ habilitado: false })}
          >
            Desativar clima
          </Botao>
        </div>
      ) : null}

      {!autorizado || exibirBuscaManual ? (
        <div className="space-y-2 border-t border-[var(--borda)] pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1 space-y-1">
              <label
                htmlFor="clima-busca-cidade"
                className="block text-xs font-semibold text-[var(--texto-sec)]"
              >
                Buscar cidade para clima
              </label>
              <input
                id="clima-busca-cidade"
                aria-label="Buscar cidade para clima"
                type="text"
                value={consultaCidade}
                onChange={(e) => setConsultaCidade(e.target.value)}
                placeholder="Ex.: Brasília"
                className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1.5 text-sm text-[var(--texto)]"
              />
            </div>

            <Botao
              variante="secundario"
              tamanho="sm"
              reduzirMovimento={reduzirMovimento}
              disabled={buscandoCidades || mutacaoConsentimento.isPending}
              onClick={() => {
                void lidarBuscarCidade();
              }}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>{buscandoCidades ? 'Buscando...' : 'Buscar cidade'}</span>
            </Botao>

            <Botao
              variante="primario"
              tamanho="sm"
              reduzirMovimento={reduzirMovimento}
              disabled={mutacaoConsentimento.isPending}
              onClick={lidarGeolocalizacao}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Usar minha localização</span>
            </Botao>
          </div>

          {sugestoes.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Sugestões de cidades">
              {sugestoes.map((item) => {
                const rotulo = `${item.cidade}${item.uf ? ` - ${item.uf}` : ''}`;
                return (
                  <li key={`${item.cidade}-${item.latitudeAprox}-${item.longitudeAprox}`}>
                    <button
                      type="button"
                      onClick={() =>
                        mutacaoConsentimento.mutate({
                          habilitado: true,
                          modoLocalizacao: 'cidade_manual',
                          cidade: item.cidade,
                          uf: item.uf,
                          latitudeAprox: arredondarCoordenadaAproximada(item.latitudeAprox),
                          longitudeAprox: arredondarCoordenadaAproximada(item.longitudeAprox),
                        })
                      }
                      className="min-h-9 cursor-pointer rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1 text-xs font-semibold text-[var(--texto)] hover:border-[var(--primaria)]"
                    >
                      {rotulo}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {erroClima ? (
        <p role="alert" className="text-xs font-medium text-[var(--erro)]">
          {erroClima}
        </p>
      ) : null}
    </CartaoBento>
  );
}
