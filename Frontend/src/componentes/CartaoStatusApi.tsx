import type { EstadoDependencia, EstadoSaudeApi } from '../servicos/tipos-saude';
import { Botao } from './Botao';
import { CartaoBento } from './CartaoBento';

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
    <CartaoBento aria-label="Status inicial da API" className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borda)] pb-4">
        <div>
          <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
            Conexão com o backend
          </h2>
          <p className="text-sm text-[var(--texto-sec)]">
            Proxy local Vite para <code className="numero-tabular">/api/saude</code>
          </p>
        </div>

        <Botao variante="secundario" tamanho="sm" onClick={aoTentarNovamente} disabled={carregando}>
          {carregando ? 'Verificando...' : 'Atualizar'}
        </Botao>
      </div>

      <div className="mt-4">
        {carregando && !dados && !erro && (
          <p className="text-sm text-[var(--texto-sec)]">Verificando conexão com a API...</p>
        )}

        {erro && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-[var(--erro)] bg-[var(--superficie-alt)] p-4 text-sm text-[var(--texto)]"
          >
            <p className="font-medium text-[var(--erro)]">Falha ao consultar a API: {erro}</p>
            <div>
              <Botao variante="perigo" tamanho="sm" onClick={aoTentarNovamente}>
                Tentar novamente
              </Botao>
            </div>
          </div>
        )}

        {dados && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3">
              <dt className="text-xs font-medium text-[var(--texto-sec)]">Serviço</dt>
              <dd className="numero-tabular mt-1 text-sm font-semibold text-[var(--texto)]">
                {dados.servico} (v{dados.versao})
              </dd>
            </div>

            <div className="rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3">
              <dt className="text-xs font-medium text-[var(--texto-sec)]">Estado geral</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--primaria)]">
                {dados.status === 'ok' ? 'Operacional (ok)' : 'Degradado'}
              </dd>
            </div>

            <div className="rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3">
              <dt className="text-xs font-medium text-[var(--texto-sec)]">
                Banco relacional (PostgreSQL)
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--texto)]">
                {ROTULOS_DEPENDENCIA[dados.bancoRelacional]}
              </dd>
            </div>

            <div className="rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3">
              <dt className="text-xs font-medium text-[var(--texto-sec)]">
                Banco documental (MongoDB)
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--texto)]">
                {ROTULOS_DEPENDENCIA[dados.bancoDocumental]}
              </dd>
            </div>

            <div className="rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3 sm:col-span-2">
              <dt className="text-xs font-medium text-[var(--texto-sec)]">
                Registro UTC da consulta
              </dt>
              <dd className="numero-tabular mt-1 text-xs text-[var(--texto-sec)]">
                {dados.timestamp}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </CartaoBento>
  );
}
