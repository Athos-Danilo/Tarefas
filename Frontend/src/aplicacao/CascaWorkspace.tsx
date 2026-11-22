import { Compass, LogOut, UserCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import type { FaixaFavicon } from '../astronomia/tipos';
import { Botao } from '../componentes/Botao';
import { CartaoBento } from '../componentes/CartaoBento';
import { SeloMarcaLume } from '../componentes/SeloMarcaLume';
import { useAutenticacao } from '../hooks/usar-autenticacao';

export interface PropriedadesCascaWorkspace {
  faixaFavicon: FaixaFavicon;
  reduzirMovimento: boolean;
}

export function CascaWorkspace({ faixaFavicon, reduzirMovimento }: PropriedadesCascaWorkspace) {
  const { estadoSessao, servico, definirSessao } = useAutenticacao();
  const [saindo, setSaindo] = useState(false);
  const localizacao = useLocation();
  const navegar = useNavigate();

  if (!estadoSessao.autenticado) {
    return null;
  }

  const { usuario } = estadoSessao;
  const avatarSrc = usuario.avatarUrl ?? '/assets-3d/avatares/sol-nascente.png';

  const lidarSair = async () => {
    setSaindo(true);
    try {
      await servico.sair();
    } finally {
      definirSessao({ autenticado: false, usuario: null, sessao: null });
      setSaindo(false);
      void navegar('/', { replace: true });
    }
  };

  const links = [
    { rota: '/jornada', rotulo: 'Jornada', Icone: Compass },
    { rota: '/perfil', rotulo: 'Perfil', Icone: UserCircle2 },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 pb-24 md:flex-row md:px-6 md:pb-8">
      <aside
        aria-label="Navegação principal do workspace"
        className="hidden shrink-0 md:block md:w-[78px] lg:w-64"
      >
        <CartaoBento
          as="aside"
          className="sticky top-6 flex flex-col justify-between gap-6 p-3 lg:p-5"
        >
          <div className="space-y-6">
            <div className="hidden lg:block">
              <SeloMarcaLume faixaFavicon={faixaFavicon} />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-2">
              <img
                src={avatarSrc}
                alt={`Avatar de ${usuario.nomeExibicao}`}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-bold text-[var(--texto)]">
                  {usuario.nomeExibicao}
                </p>
                <p className="truncate text-xs text-[var(--texto-sec)]">{usuario.email}</p>
              </div>
            </div>

            <nav aria-label="Visões do Lume" className="flex flex-col gap-2">
              {links.map(({ rota, rotulo, Icone }) => {
                const ativo = localizacao.pathname === rota;
                return (
                  <Link
                    key={rota}
                    to={rota}
                    aria-label={rotulo}
                    className={`flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors lg:justify-start ${
                      ativo
                        ? 'bg-[var(--primaria)] text-[var(--primaria-texto)]'
                        : 'bg-[var(--superficie-alt)] text-[var(--texto)] hover:opacity-90'
                    }`}
                  >
                    <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="hidden lg:inline">{rotulo}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <Botao
            variante="secundario"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            disabled={saindo}
            onClick={() => {
              void lidarSair();
            }}
            aria-label="Sair da conta"
            className="w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{saindo ? 'Saindo...' : 'Sair'}</span>
          </Botao>
        </CartaoBento>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação inferior móvel"
        className="superficie-bento fixed right-3 bottom-3 left-3 z-30 flex items-center justify-around rounded-2xl p-2 shadow-xl md:hidden"
      >
        {links.map(({ rota, rotulo, Icone }) => {
          const ativo = localizacao.pathname === rota;
          return (
            <Link
              key={rota}
              to={rota}
              className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold ${
                ativo ? 'bg-[var(--primaria)] text-[var(--primaria-texto)]' : 'text-[var(--texto)]'
              }`}
            >
              <Icone className="h-4 w-4" aria-hidden="true" />
              <span>{rotulo}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            void lidarSair();
          }}
          disabled={saindo}
          className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[var(--texto)]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
}
