import { useContext } from 'react';
import {
  ContextoAutenticacao,
  type ValorContextoAutenticacao,
} from '../aplicacao/contexto-autenticacao-base';

export function useAutenticacao(): ValorContextoAutenticacao {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) {
    throw new Error('useAutenticacao deve ser usado dentro de ProvedorAutenticacao.');
  }
  return contexto;
}
