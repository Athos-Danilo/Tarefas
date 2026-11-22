import { Navigate, Outlet } from 'react-router';
import { CartaoBento } from '../componentes/CartaoBento';
import { useAutenticacao } from '../hooks/usar-autenticacao';

function CarregandoSessao({ texto }: { texto: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
      <CartaoBento className="w-full text-center">
        <p className="text-sm font-medium text-[var(--texto-sec)]">{texto}</p>
      </CartaoBento>
    </main>
  );
}

export function RotaAutenticada() {
  const { estadoSessao, carregandoSessao } = useAutenticacao();

  if (carregandoSessao) {
    return <CarregandoSessao texto="Verificando sessão autenticada..." />;
  }

  if (!estadoSessao.autenticado) {
    return <Navigate to="/" replace />;
  }

  if (!estadoSessao.usuario.primeiroAcessoConcluido) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  return <Outlet />;
}

export function RotaPrimeiroAcesso() {
  const { estadoSessao, carregandoSessao } = useAutenticacao();

  if (carregandoSessao) {
    return <CarregandoSessao texto="Carregando configurações de boas-vindas..." />;
  }

  if (!estadoSessao.autenticado) {
    return <Navigate to="/" replace />;
  }

  if (estadoSessao.usuario.primeiroAcessoConcluido) {
    return <Navigate to="/jornada" replace />;
  }

  return <Outlet />;
}
