import type { EstadoDependencia, EstadoSaudeApi } from '../servicos/tipos-saude';

interface PropriedadesCartaoStatusApi {
  carregando: boolean;
  dados: EstadoSaudeApi | null;
  erro: string | null;
  aoTentarNovamente: () => void;
}

const ROTULOS_DEPENDENCIA: Record<EstadoDependencia, string> = {
  conectado: 'Conectado',
  nao_configurado: 'Não configurado',
  indisponivel: 'Indisponível',
};

export function CartaoStatusApi({
  carregando,
  dados,
  erro,
  aoTentarNovamente,
}: PropriedadesCartaoStatusApi) {
  return (
    <section
      aria-label="Status inicial da API"
      className="w-full max-w-2xl rounded-3xl border border-[var(--cor-borda)] bg-[var(--cor-superficie)] p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cor-borda)] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--cor-texto-principal)]">
            Conexão com o backend
          </h2>
          <p className="text-sm text-[var(--cor-texto-suave)]">
            Proxy local Vite para <code className="font-mono">/api/saude</code>
          </p>
        </div>

        <button
          type="button"
          onClick={aoTentarNovamente}
          disabled={carregando}
          className="cursor-pointer rounded-full border border-[var(--cor-borda)] px-4 py-2 text-sm font-semibold text-[var(--cor-texto-principal)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {carregando ? 'Verificando...' : 'Atualizar'}
        </button>
      </div>

      <div className="mt-4">
        {carregando && !dados && !erro && (
          <p className="text-sm text-[var(--cor-texto-suave)]">Verificando conexão com a API...</p>
        )}

        {erro && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <p className="font-medium">Falha ao consultar a API: {erro}</p>
            <div>
              <button
                type="button"
                onClick={aoTentarNovamente}
                className="cursor-pointer rounded-full bg-red-800 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-900"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {dados && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-black/[0.03] p-3">
              <dt className="text-xs font-medium text-[var(--cor-texto-suave)]">Serviço</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-[var(--cor-texto-principal)]">
                {dados.servico} (v{dados.versao})
              </dd>
            </div>

            <div className="rounded-2xl bg-black/[0.03] p-3">
              <dt className="text-xs font-medium text-[var(--cor-texto-suave)]">Estado geral</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--cor-primaria)]">
                {dados.status === 'ok' ? 'Operacional (ok)' : 'Degradado'}
              </dd>
            </div>

            <div className="rounded-2xl bg-black/[0.03] p-3">
              <dt className="text-xs font-medium text-[var(--cor-texto-suave)]">
                Banco relacional (PostgreSQL)
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--cor-texto-principal)]">
                {ROTULOS_DEPENDENCIA[dados.bancoRelacional]}
              </dd>
            </div>

            <div className="rounded-2xl bg-black/[0.03] p-3">
              <dt className="text-xs font-medium text-[var(--cor-texto-suave)]">
                Banco documental (MongoDB)
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--cor-texto-principal)]">
                {ROTULOS_DEPENDENCIA[dados.bancoDocumental]}
              </dd>
            </div>

            <div className="rounded-2xl bg-black/[0.03] p-3 sm:col-span-2">
              <dt className="text-xs font-medium text-[var(--cor-texto-suave)]">
                Registro UTC da consulta
              </dt>
              <dd className="mt-1 font-mono text-xs text-[var(--cor-texto-suave)]">
                {dados.timestamp}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
