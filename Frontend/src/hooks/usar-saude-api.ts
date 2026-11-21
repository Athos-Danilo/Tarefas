import { useCallback, useEffect, useState } from 'react';
import type { BuscadorDeSaude, EstadoSaudeApi } from '../servicos/tipos-saude';

export interface SituacaoSaudeApi {
  carregando: boolean;
  dados: EstadoSaudeApi | null;
  erro: string | null;
  recarregar: () => Promise<void>;
}

interface EstadoInternoSaude {
  carregando: boolean;
  dados: EstadoSaudeApi | null;
  erro: string | null;
}

export function useSaudeApi(buscador: BuscadorDeSaude): SituacaoSaudeApi {
  const [estado, setEstado] = useState<EstadoInternoSaude>({
    carregando: true,
    dados: null,
    erro: null,
  });

  useEffect(() => {
    let ativo = true;

    void buscador
      .consultarSaude()
      .then((dadosRecebidos) => {
        if (!ativo) {
          return;
        }
        setEstado({ carregando: false, dados: dadosRecebidos, erro: null });
      })
      .catch((falha: unknown) => {
        if (!ativo) {
          return;
        }
        const mensagem =
          falha instanceof Error ? falha.message : 'Nao foi possivel consultar o estado da API.';
        setEstado({ carregando: false, dados: null, erro: mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [buscador]);

  const recarregar = useCallback(async (): Promise<void> => {
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));
    try {
      const dadosRecebidos = await buscador.consultarSaude();
      setEstado({ carregando: false, dados: dadosRecebidos, erro: null });
    } catch (falha: unknown) {
      const mensagem =
        falha instanceof Error ? falha.message : 'Nao foi possivel consultar o estado da API.';
      setEstado({ carregando: false, dados: null, erro: mensagem });
    }
  }, [buscador]);

  return {
    carregando: estado.carregando,
    dados: estado.dados,
    erro: estado.erro,
    recarregar,
  };
}
