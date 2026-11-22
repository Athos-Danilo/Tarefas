import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { criarServicoAutenticacao } from '../servicos/cliente-autenticacao';
import type { EstadoSessao, ServicoAutenticacaoFrontend } from '../servicos/tipos-conta';
import { ContextoAutenticacao } from './contexto-autenticacao-base';

export interface PropriedadesProvedorAutenticacao {
  servicoAutenticacao?: ServicoAutenticacaoFrontend;
  children: ReactNode;
}

const SESSAO_ANONIMA: EstadoSessao = {
  autenticado: false,
  usuario: null,
  sessao: null,
};

export function ProvedorAutenticacao({
  servicoAutenticacao,
  children,
}: PropriedadesProvedorAutenticacao) {
  const queryClient = useQueryClient();
  const [tutorialSolicitadoRevisao, setTutorialSolicitadoRevisao] = useState(false);

  const servico = useMemo(
    () => servicoAutenticacao ?? criarServicoAutenticacao(),
    [servicoAutenticacao],
  );

  const { data, isLoading } = useQuery<EstadoSessao>({
    queryKey: ['sessao-lume', servico],
    queryFn: async () => {
      try {
        return await servico.consultarSessao();
      } catch {
        return SESSAO_ANONIMA;
      }
    },
    staleTime: 30_000,
  });

  const definirSessao = useCallback(
    (novaSessao: EstadoSessao) => {
      queryClient.setQueryData(['sessao-lume', servico], novaSessao);
    },
    [queryClient, servico],
  );

  const recarregarSessao = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['sessao-lume', servico] });
  }, [queryClient, servico]);

  const solicitarRevisaoTutorial = useCallback(() => {
    setTutorialSolicitadoRevisao(true);
  }, []);

  const valor = useMemo(
    () => ({
      estadoSessao: data ?? SESSAO_ANONIMA,
      carregandoSessao: isLoading,
      servico,
      recarregarSessao,
      definirSessao,
      tutorialSolicitadoRevisao,
      solicitarRevisaoTutorial,
    }),
    [
      data,
      isLoading,
      servico,
      recarregarSessao,
      definirSessao,
      tutorialSolicitadoRevisao,
      solicitarRevisaoTutorial,
    ],
  );

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}
