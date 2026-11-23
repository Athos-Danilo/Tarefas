import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, LogIn, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import type { FaixaFavicon } from '../../astronomia/tipos';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { SeloMarcaLume } from '../../componentes/SeloMarcaLume';
import { useAutenticacao } from '../../hooks/usar-autenticacao';
import { URL_LOGIN_GOOGLE } from '../../servicos/cliente-autenticacao';
import { ErroApi } from '../../servicos/cliente-http';
import type { ServicoGruposFrontend } from '../../servicos/tipos-grupos';
import {
  encontrarVagaAutomaticaPorEmail,
  limparConvitePendente,
  salvarConvitePendente,
} from './logica-grupos';

export interface PropriedadesPaginaConviteGrupo {
  faixaFavicon: FaixaFavicon;
  servicoGrupos: ServicoGruposFrontend;
  reduzirMovimento: boolean;
}

export function PaginaConviteGrupo({
  faixaFavicon,
  servicoGrupos,
  reduzirMovimento,
}: PropriedadesPaginaConviteGrupo) {
  const { token = '' } = useParams();
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const { estadoSessao, carregandoSessao } = useAutenticacao();

  const [vagaManualSelecionada, setVagaManualSelecionada] = useState<string | null | undefined>(
    undefined,
  );
  const [erroEntrada, setErroEntrada] = useState<string | null>(null);

  const podeConsultarPrevia =
    !carregandoSessao &&
    Boolean(token) &&
    estadoSessao.autenticado &&
    estadoSessao.usuario.primeiroAcessoConcluido;

  useEffect(() => {
    if (
      !carregandoSessao &&
      token &&
      (!estadoSessao.autenticado || !estadoSessao.usuario.primeiroAcessoConcluido)
    ) {
      salvarConvitePendente(token);
    }
  }, [carregandoSessao, token, estadoSessao]);

  const consultaPrevia = useQuery({
    queryKey: ['convite-previa', token],
    queryFn: () => servicoGrupos.obterPreviaConvite(token),
    enabled: podeConsultarPrevia,
  });

  const mutacaoEntrar = useMutation({
    mutationFn: ({ codigo, vagaId }: { codigo: string; vagaId: string | null }) =>
      servicoGrupos.entrarPorConvite(codigo, vagaId),
    onSuccess: async () => {
      limparConvitePendente();
      await queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      await queryClient.invalidateQueries({ queryKey: ['grupos-desempenho'] });
      void navegar('/jornada', { replace: true });
    },
    onError: (falha) => {
      setErroEntrada(
        falha instanceof ErroApi ? falha.mensagem : 'Não foi possível concluir a entrada no grupo.',
      );
    },
  });

  if (carregandoSessao) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <CartaoBento className="w-full text-center">
          <p className="text-sm font-medium text-[var(--texto-sec)]">
            Verificando seu acesso ao convite...
          </p>
        </CartaoBento>
      </main>
    );
  }

  if (!estadoSessao.autenticado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
        <CartaoBento destacado className="space-y-5">
          <SeloMarcaLume faixaFavicon={faixaFavicon} />
          <div className="space-y-2">
            <h1 className="fonte-display text-2xl font-bold text-[var(--texto)]">
              Convite para Tarefa em Conjunto
            </h1>
            <p className="text-sm text-[var(--texto-sec)]">
              Entre com sua conta Google para visualizar os detalhes do projeto compartilhado,
              vincular sua vaga e colaborar com a equipe.
            </p>
          </div>

          <a
            href={URL_LOGIN_GOOGLE}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primaria)] px-4 py-2.5 text-sm font-bold text-[var(--primaria-texto)]"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Entrar com Google para aceitar o convite</span>
          </a>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--texto-sec)] underline"
          >
            <span>Voltar para a apresentação do Lume</span>
          </Link>
        </CartaoBento>
      </main>
    );
  }

  if (!estadoSessao.usuario.primeiroAcessoConcluido) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  const previa = consultaPrevia.data;
  const vagaAuto = previa
    ? encontrarVagaAutomaticaPorEmail(previa.vagasDisponiveis, estadoSessao.usuario.email)
    : null;
  const vagaSelecionada =
    vagaManualSelecionada !== undefined ? vagaManualSelecionada : (vagaAuto?.id ?? null);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-10">
      <CartaoBento destacado className="space-y-5">
        <SeloMarcaLume faixaFavicon={faixaFavicon} />

        {consultaPrevia.isLoading ? (
          <p className="text-sm text-[var(--texto-sec)]">Carregando prévia do convite...</p>
        ) : consultaPrevia.isError || !previa ? (
          <div role="alert" className="space-y-3">
            <h1 className="fonte-display text-xl font-bold text-[var(--erro)]">
              Convite inválido ou revogado
            </h1>
            <p className="text-sm text-[var(--texto-sec)]">
              Este link não está mais ativo. Peça um novo link ao líder da Tarefa em Conjunto.
            </p>
            <Link
              to="/jornada"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-4 text-sm font-semibold text-[var(--texto)]"
            >
              <span>Ir para minha Jornada do Dia</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primaria)]">
                <Users className="h-4 w-4" aria-hidden="true" />
                Convite para Tarefa em Conjunto
              </span>
              <h1 className="fonte-display mt-1 text-2xl font-bold text-[var(--texto)]">
                {previa.titulo}
              </h1>
              <p className="mt-1 text-sm text-[var(--texto-sec)]">
                Líder do projeto:{' '}
                <strong className="text-[var(--texto)]">{previa.liderNome}</strong>
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
              <h2 className="text-xs font-bold tracking-wide text-[var(--texto-sec)] uppercase">
                Integrantes já ativos ({previa.membrosAtivos.length})
              </h2>
              <ul className="flex flex-wrap gap-2">
                {previa.membrosAtivos.map((m) => (
                  <li
                    key={m.usuarioId}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-1 text-xs font-semibold text-[var(--texto)]"
                  >
                    <span>{m.nomeExibicao}</span>
                    <span className="text-[var(--texto-sec)]">
                      ({m.papel === 'lider' ? 'Líder' : 'Colaborador'})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {previa.jaEMembro ? (
              <div className="space-y-3 rounded-2xl border border-[var(--sucesso)] bg-[var(--superficie-alt)] p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sucesso)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Você já faz parte desta Tarefa em Conjunto.
                </p>
                <Link
                  to="/jornada"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primaria)] px-4 text-sm font-bold text-[var(--primaria-texto)]"
                >
                  <span>Abrir na Jornada do Dia</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <>
                {vagaAuto ? (
                  <div
                    role="status"
                    className="rounded-2xl border border-[var(--primaria)] bg-[var(--superficie-alt)] p-3 text-xs font-semibold text-[var(--primaria)]"
                  >
                    Vínculo automático pelo seu e-mail ({estadoSessao.usuario.email}) detectado para
                    a vaga "{vagaAuto.nomeExibicao}".
                  </div>
                ) : null}

                <fieldset className="space-y-2">
                  <legend className="text-xs font-bold tracking-wide text-[var(--texto-sec)] uppercase">
                    Escolha sua vaga neste projeto
                  </legend>

                  {previa.vagasDisponiveis.map((vaga) => (
                    <label
                      key={vaga.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2.5 font-semibold text-[var(--texto)]">
                        <input
                          type="radio"
                          name="vaga-convite"
                          checked={vagaSelecionada === vaga.id}
                          onChange={() => setVagaManualSelecionada(vaga.id)}
                        />
                        <span>{vaga.nomeExibicao}</span>
                      </span>
                      {vaga.emailOpcional ? (
                        <span className="font-mono text-xs text-[var(--texto-sec)]">
                          {vaga.emailOpcional}
                        </span>
                      ) : null}
                    </label>
                  ))}

                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2.5 text-sm text-[var(--texto-sec)]">
                    <input
                      type="radio"
                      name="vaga-convite"
                      checked={vagaSelecionada === null}
                      onChange={() => setVagaManualSelecionada(null)}
                    />
                    <span>Entrar sem vaga específica (atribuição posterior pelo líder)</span>
                  </label>
                </fieldset>

                {erroEntrada ? (
                  <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
                    {erroEntrada}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Link
                    to="/jornada"
                    className="text-xs font-semibold text-[var(--texto-sec)] underline"
                  >
                    Cancelar e voltar
                  </Link>
                  <Botao
                    type="button"
                    variante="primario"
                    reduzirMovimento={reduzirMovimento}
                    disabled={mutacaoEntrar.isPending}
                    onClick={() => mutacaoEntrar.mutate({ codigo: token, vagaId: vagaSelecionada })}
                  >
                    <span>
                      {mutacaoEntrar.isPending ? 'Entrando...' : 'Confirmar entrada no grupo'}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Botao>
                </div>
              </>
            )}
          </div>
        )}
      </CartaoBento>
    </main>
  );
}
