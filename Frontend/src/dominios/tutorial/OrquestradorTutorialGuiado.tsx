import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useLocation } from 'react-router';
import { useAutenticacao } from '../../hooks/usar-autenticacao';
import type {
  EntradaAtualizarPreferencias,
  PreferenciasCenarioFrontend,
  ServicoEstatisticasFrontend,
} from '../../servicos/tipos-estatisticas';
import { TourGuiadoLume } from './TourGuiadoLume';
import {
  avancarPassoTutorial,
  deveIniciarTutorialAutomaticamente,
  pularTutorial,
  resolverPassoInicial,
  voltarPassoTutorial,
} from './passos-tutorial';

export interface PropriedadesOrquestradorTutorial {
  servicoEstatisticas: ServicoEstatisticasFrontend;
  reduzirMovimento: boolean;
}

export function OrquestradorTutorialGuiado({
  servicoEstatisticas,
  reduzirMovimento,
}: PropriedadesOrquestradorTutorial) {
  const {
    estadoSessao,
    tutorialSolicitadoRevisao,
    versaoRevisaoTutorial,
    consumirRevisaoTutorial,
  } = useAutenticacao();
  const localizacao = useLocation();
  const queryClient = useQueryClient();

  const [versaoDispensada, setVersaoDispensada] = useState<number>(-1);
  const [estadoPasso, setEstadoPasso] = useState<{ versao: number; numero: number } | null>(null);

  const consultaPrefs = useQuery<PreferenciasCenarioFrontend | null>({
    queryKey: ['preferencias-cenario'],
    enabled: estadoSessao.autenticado,
    queryFn: async () => {
      try {
        return await servicoEstatisticas.obterPreferencias();
      } catch {
        return null;
      }
    },
  });

  const mutacaoTutorial = useMutation({
    mutationFn: (entrada: EntradaAtualizarPreferencias) =>
      servicoEstatisticas.atualizarPreferencias(entrada),
    onSuccess: (salvas) => {
      queryClient.setQueryData(['preferencias-cenario'], salvas);
    },
  });

  const prefs = consultaPrefs.data;
  const statusPersistido = prefs?.tutorial.status;
  const etapaPersistida = prefs?.tutorial.etapaAtual ?? 0;

  const querAbrir =
    estadoSessao.autenticado &&
    prefs !== null &&
    prefs !== undefined &&
    deveIniciarTutorialAutomaticamente(
      statusPersistido,
      localizacao.pathname,
      tutorialSolicitadoRevisao,
    ) &&
    versaoDispensada !== versaoRevisaoTutorial;

  const modoRevisao = Boolean(tutorialSolicitadoRevisao && statusPersistido !== 'pendente');
  const passoAtual =
    estadoPasso && estadoPasso.versao === versaoRevisaoTutorial
      ? estadoPasso.numero
      : resolverPassoInicial(etapaPersistida, modoRevisao);

  const aplicarCacheOtimista = useCallback(
    (statusNovo: 'pendente' | 'pulado' | 'concluido', etapaNova: number) => {
      queryClient.setQueryData<PreferenciasCenarioFrontend | null>(
        ['preferencias-cenario'],
        (atual) =>
          atual
            ? {
                ...atual,
                tutorial: {
                  status: statusNovo,
                  etapaAtual: etapaNova,
                },
              }
            : atual,
      );
    },
    [queryClient],
  );

  const lidarAvancar = useCallback(() => {
    if (!statusPersistido) {
      return;
    }
    const resultado = avancarPassoTutorial({
      passoAtual,
      statusPersistido,
      modoRevisao,
    });
    if (resultado.atualizacaoPersistida) {
      aplicarCacheOtimista(
        resultado.atualizacaoPersistida.status,
        resultado.atualizacaoPersistida.etapaAtual,
      );
      mutacaoTutorial.mutate({ tutorial: resultado.atualizacaoPersistida });
    }
    if (!resultado.aberto) {
      setVersaoDispensada(versaoRevisaoTutorial);
      setEstadoPasso(null);
      if (tutorialSolicitadoRevisao) {
        consumirRevisaoTutorial();
      }
      return;
    }
    setEstadoPasso({ versao: versaoRevisaoTutorial, numero: resultado.proximoPasso });
  }, [
    aplicarCacheOtimista,
    consumirRevisaoTutorial,
    modoRevisao,
    mutacaoTutorial,
    passoAtual,
    statusPersistido,
    tutorialSolicitadoRevisao,
    versaoRevisaoTutorial,
  ]);

  const lidarVoltar = useCallback(() => {
    const anterior = voltarPassoTutorial(passoAtual);
    setEstadoPasso({ versao: versaoRevisaoTutorial, numero: anterior });
  }, [passoAtual, versaoRevisaoTutorial]);

  const lidarPular = useCallback(() => {
    if (!statusPersistido) {
      return;
    }
    const resultado = pularTutorial({
      passoAtual,
      statusPersistido,
      modoRevisao,
    });
    if (resultado.atualizacaoPersistida) {
      aplicarCacheOtimista(
        resultado.atualizacaoPersistida.status,
        resultado.atualizacaoPersistida.etapaAtual,
      );
      mutacaoTutorial.mutate({ tutorial: resultado.atualizacaoPersistida });
    }
    setVersaoDispensada(versaoRevisaoTutorial);
    setEstadoPasso(null);
    if (tutorialSolicitadoRevisao) {
      consumirRevisaoTutorial();
    }
  }, [
    aplicarCacheOtimista,
    consumirRevisaoTutorial,
    modoRevisao,
    mutacaoTutorial,
    passoAtual,
    statusPersistido,
    tutorialSolicitadoRevisao,
    versaoRevisaoTutorial,
  ]);

  return (
    <TourGuiadoLume
      aberto={querAbrir}
      passoNumero={passoAtual}
      reduzirMovimento={reduzirMovimento}
      aoAvancar={lidarAvancar}
      aoVoltar={lidarVoltar}
      aoPular={lidarPular}
    />
  );
}
