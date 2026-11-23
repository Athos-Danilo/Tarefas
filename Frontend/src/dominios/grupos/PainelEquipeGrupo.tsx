import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Check,
  Copy,
  Crown,
  Link2Off,
  LogOut,
  RefreshCw,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Botao } from '../../componentes/Botao';
import { ErroApi } from '../../servicos/cliente-http';
import { construirLinkConviteAbsoluto } from '../../servicos/cliente-grupos';
import type { PainelDesempenhoGrupo, ServicoGruposFrontend } from '../../servicos/tipos-grupos';
import {
  esquemaNovaVaga,
  formatarHorarioAtividade,
  MAX_PARTICIPANTES_GRUPO,
} from './logica-grupos';

export interface PropriedadesPainelEquipeGrupo {
  aberto: boolean;
  painel: PainelDesempenhoGrupo | null;
  carregando: boolean;
  erro: string | null;
  usuarioAtualId: string;
  servicoGrupos: ServicoGruposFrontend;
  aoFechar: () => void;
  aoAtualizarTudo: () => Promise<void>;
  aoSairDoGrupo: (tarefaRaizId: string) => Promise<void>;
  reduzirMovimento: boolean;
}

interface CamposNovaVagaForm {
  nomeExibicao: string;
  emailOpcional: string;
}

export function PainelEquipeGrupo({
  aberto,
  painel,
  carregando,
  erro,
  usuarioAtualId,
  servicoGrupos,
  aoFechar,
  aoAtualizarTudo,
  aoSairDoGrupo,
  reduzirMovimento,
}: PropriedadesPainelEquipeGrupo) {
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const formularioVaga = useForm<CamposNovaVagaForm>({
    resolver: zodResolver(esquemaNovaVaga),
    defaultValues: {
      nomeExibicao: '',
      emailOpcional: '',
    },
  });

  const executarComTratamento = async (acao: () => Promise<void>, mensagemSucesso?: string) => {
    setErroAcao(null);
    setFeedback(null);
    setOcupado(true);
    try {
      await acao();
      await aoAtualizarTudo();
      if (mensagemSucesso) {
        setFeedback(mensagemSucesso);
      }
    } catch (falha) {
      if (falha instanceof ErroApi) {
        setErroAcao(falha.mensagem);
      } else {
        setErroAcao(
          falha instanceof Error ? falha.message : 'Não foi possível concluir a ação no grupo.',
        );
      }
    } finally {
      setOcupado(false);
    }
  };

  const lidarCriarVaga = formularioVaga.handleSubmit(async (valores) => {
    if (!painel) {
      return;
    }
    await executarComTratamento(async () => {
      await servicoGrupos.criarVaga(painel.tarefaRaizId, {
        nomeExibicao: valores.nomeExibicao,
        emailOpcional: valores.emailOpcional ? valores.emailOpcional : null,
      });
      formularioVaga.reset({ nomeExibicao: '', emailOpcional: '' });
    }, 'Vaga criada com sucesso.');
  });

  const lidarCopiarLink = async (token: string) => {
    const link = construirLinkConviteAbsoluto(token);
    try {
      await navigator.clipboard?.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setFeedback(`Link ativo: ${link}`);
    }
  };

  const ehLider = painel?.meuPapel === 'lider';
  const totalSlots = painel ? painel.integrantes.length + painel.vagasAbertas.length : 0;
  const linkCompleto =
    painel?.linkConviteAtivo && painel.codigoToken
      ? construirLinkConviteAbsoluto(painel.codigoToken)
      : null;

  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(proximo) => {
        if (!proximo) {
          aoFechar();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs" />
        <Dialog.Content className="superficie-bento fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl overflow-y-auto p-6 text-[var(--texto)] shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--borda)] pb-4">
            <div>
              <Dialog.Title className="fonte-display flex items-center gap-2 text-xl font-bold text-[var(--texto)]">
                <Users className="h-5 w-5 text-[var(--primaria)]" aria-hidden="true" />
                <span>{painel ? `Equipe: ${painel.titulo}` : 'Painel da equipe'}</span>
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[var(--texto-sec)]">
                {painel
                  ? `Seu papel: ${ehLider ? 'Líder' : 'Colaborador'} · Sincronização automática (12s)`
                  : 'Consultando informações da Tarefa em Conjunto...'}
              </Dialog.Description>
            </div>

            <Dialog.Close
              aria-label="Fechar painel da equipe"
              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-5">
            {carregando && !painel ? (
              <p className="text-sm text-[var(--texto-sec)]">Carregando painel da equipe...</p>
            ) : erro && !painel ? (
              <p role="alert" className="text-sm font-semibold text-[var(--erro)]">
                {erro}
              </p>
            ) : painel ? (
              <>
                <section className="space-y-3 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--texto-sec)]">
                        Progresso geral da equipe
                      </p>
                      <p className="font-mono text-lg font-bold text-[var(--texto)]">
                        {painel.resumoGeral.percentualGeral}% ({painel.resumoGeral.folhasConcluidas}
                        /{painel.resumoGeral.totalSubtarefasFolha} folhas)
                      </p>
                    </div>
                    <Botao
                      type="button"
                      variante="fantasma"
                      tamanho="sm"
                      reduzirMovimento={reduzirMovimento}
                      disabled={ocupado}
                      onClick={() => {
                        void aoAtualizarTudo();
                      }}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      <span>Atualizar agora</span>
                    </Botao>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--superficie-solida)]">
                    <div
                      className="h-full rounded-full bg-[var(--primaria)] transition-all"
                      style={{ width: `${painel.resumoGeral.percentualGeral}%` }}
                    />
                  </div>
                </section>

                {ehLider ? (
                  <section className="space-y-3 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
                    <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
                      Link de convite da equipe
                    </h3>
                    {linkCompleto && painel.codigoToken ? (
                      <div className="space-y-2">
                        <p className="break-all rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-2 font-mono text-xs text-[var(--texto)]">
                          {linkCompleto}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Botao
                            type="button"
                            variante="primario"
                            tamanho="sm"
                            reduzirMovimento={reduzirMovimento}
                            onClick={() => {
                              if (painel.codigoToken) {
                                void lidarCopiarLink(painel.codigoToken);
                              }
                            }}
                          >
                            {copiado ? (
                              <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span>{copiado ? 'Link copiado' : 'Copiar link'}</span>
                          </Botao>
                          <Botao
                            type="button"
                            variante="secundario"
                            tamanho="sm"
                            reduzirMovimento={reduzirMovimento}
                            disabled={ocupado}
                            onClick={() => {
                              void executarComTratamento(async () => {
                                await servicoGrupos.regenerarConvite(painel.tarefaRaizId);
                              }, 'Novo link de convite gerado.');
                            }}
                          >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            <span>Regenerar link</span>
                          </Botao>
                          <Botao
                            type="button"
                            variante="perigo"
                            tamanho="sm"
                            reduzirMovimento={reduzirMovimento}
                            disabled={ocupado}
                            onClick={() => {
                              void executarComTratamento(async () => {
                                await servicoGrupos.revogarConvites(painel.tarefaRaizId);
                              }, 'Link de convite revogado.');
                            }}
                          >
                            <Link2Off className="h-4 w-4" aria-hidden="true" />
                            <span>Revogar link</span>
                          </Botao>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--texto-sec)]">
                          Link de convite revogado ou inativo. Novos membros não podem entrar até
                          você gerar um novo link.
                        </p>
                        <Botao
                          type="button"
                          variante="secundario"
                          tamanho="sm"
                          reduzirMovimento={reduzirMovimento}
                          disabled={ocupado}
                          onClick={() => {
                            void executarComTratamento(async () => {
                              await servicoGrupos.regenerarConvite(painel.tarefaRaizId);
                            }, 'Link de convite reativado.');
                          }}
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          <span>Regenerar link</span>
                        </Botao>
                      </div>
                    )}
                  </section>
                ) : (
                  <p className="rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2 text-xs text-[var(--texto-sec)]">
                    Apenas o líder pode criar vagas, gerenciar links de convite ou atribuir
                    responsáveis. Você pode atuar e escrever notas nas etapas atribuídas a você.
                  </p>
                )}

                <section className="space-y-3 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
                      Integrantes ({painel.integrantes.length})
                    </h3>
                    <span className="font-mono text-xs text-[var(--texto-sec)]">
                      {totalSlots} / {MAX_PARTICIPANTES_GRUPO} lugares ocupados
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {painel.integrantes.map((membro) => (
                      <li
                        key={membro.usuarioId}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={membro.avatarUrl ?? '/assets-3d/avatares/sol-nascente.png'}
                            alt={membro.nomeExibicao}
                            width={36}
                            height={36}
                            className="h-9 w-9 shrink-0 rounded-full border border-[var(--borda)] object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[var(--texto)]">
                              {membro.nomeExibicao}
                            </p>
                            <p className="text-xs text-[var(--texto-sec)]">
                              {membro.papel === 'lider' ? 'Líder' : 'Colaborador'} ·{' '}
                              {membro.concluidas}/{membro.atribuidas} folhas ({membro.percentual}%)
                            </p>
                          </div>
                        </div>

                        {ehLider && membro.usuarioId !== usuarioAtualId ? (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={ocupado}
                              aria-label={`Transferir liderança para ${membro.nomeExibicao}`}
                              onClick={() => {
                                void executarComTratamento(async () => {
                                  await servicoGrupos.transferirLideranca(
                                    painel.tarefaRaizId,
                                    membro.usuarioId,
                                  );
                                }, `Liderança transferida para ${membro.nomeExibicao}.`);
                              }}
                              className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 text-xs font-semibold text-[var(--texto)]"
                            >
                              <Crown className="h-3.5 w-3.5 text-[var(--secundaria)]" />
                              <span>Passar liderança</span>
                            </button>

                            <button
                              type="button"
                              disabled={ocupado}
                              aria-label={`Remover ${membro.nomeExibicao}`}
                              onClick={() => {
                                void executarComTratamento(async () => {
                                  await servicoGrupos.removerMembro(
                                    painel.tarefaRaizId,
                                    membro.usuarioId,
                                  );
                                }, `${membro.nomeExibicao} removido(a) do grupo.`);
                              }}
                              className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 text-xs font-semibold text-[var(--erro)]"
                            >
                              <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Remover</span>
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-3 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
                  <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
                    Vagas nomeadas abertas ({painel.vagasAbertas.length})
                  </h3>

                  {painel.vagasAbertas.length === 0 ? (
                    <p className="text-xs text-[var(--texto-sec)]">
                      Nenhuma vaga aberta no momento.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {painel.vagasAbertas.map((vaga) => (
                        <li
                          key={vaga.vagaId}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[var(--texto)]">
                              {vaga.nomeExibicao}
                            </p>
                            <p className="text-xs text-[var(--texto-sec)]">
                              {vaga.emailOpcional ? vaga.emailOpcional : 'Sem e-mail pré-vinculado'}{' '}
                              · {vaga.atribuidas} etapa(s) reservada(s)
                            </p>
                          </div>

                          {ehLider ? (
                            <button
                              type="button"
                              disabled={ocupado}
                              aria-label={`Excluir vaga ${vaga.nomeExibicao}`}
                              onClick={() => {
                                void executarComTratamento(async () => {
                                  await servicoGrupos.excluirVaga(painel.tarefaRaizId, vaga.vagaId);
                                }, `Vaga "${vaga.nomeExibicao}" removida.`);
                              }}
                              className="inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--erro)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  {ehLider && totalSlots < MAX_PARTICIPANTES_GRUPO ? (
                    <form
                      onSubmit={(e) => {
                        void lidarCriarVaga(e);
                      }}
                      className="space-y-2 border-t border-[var(--borda)] pt-3"
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label
                            htmlFor="vaga-nome"
                            className="block text-xs font-semibold text-[var(--texto-sec)]"
                          >
                            Nome da vaga
                          </label>
                          <input
                            id="vaga-nome"
                            aria-label="Nome da vaga"
                            type="text"
                            maxLength={60}
                            placeholder="Ex.: Integrante 3 (Slides)"
                            {...formularioVaga.register('nomeExibicao')}
                            className="min-h-9 w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 text-sm text-[var(--texto)]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor="vaga-email"
                            className="block text-xs font-semibold text-[var(--texto-sec)]"
                          >
                            E-mail opcional da vaga
                          </label>
                          <input
                            id="vaga-email"
                            aria-label="E-mail opcional da vaga"
                            type="email"
                            placeholder="colega@exemplo.com"
                            {...formularioVaga.register('emailOpcional')}
                            className="min-h-9 w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 text-sm text-[var(--texto)]"
                          />
                        </div>
                      </div>

                      {formularioVaga.formState.errors.nomeExibicao ? (
                        <p role="alert" className="text-xs font-medium text-[var(--erro)]">
                          {formularioVaga.formState.errors.nomeExibicao.message}
                        </p>
                      ) : null}
                      {formularioVaga.formState.errors.emailOpcional ? (
                        <p role="alert" className="text-xs font-medium text-[var(--erro)]">
                          {formularioVaga.formState.errors.emailOpcional.message}
                        </p>
                      ) : null}

                      <div className="flex justify-end">
                        <Botao
                          type="submit"
                          variante="secundario"
                          tamanho="sm"
                          reduzirMovimento={reduzirMovimento}
                          disabled={ocupado}
                        >
                          <UserPlus className="h-4 w-4" aria-hidden="true" />
                          <span>Criar vaga</span>
                        </Botao>
                      </div>
                    </form>
                  ) : null}
                </section>

                <section className="space-y-2 rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
                  <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
                    Linha do tempo da equipe
                  </h3>
                  {painel.atividadeRecente.length === 0 ? (
                    <p className="text-xs text-[var(--texto-sec)]">
                      Nenhuma atividade recente registrada.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {painel.atividadeRecente.map((evt) => (
                        <li
                          key={evt.eventoId}
                          className="rounded-xl border border-[var(--borda)] bg-[var(--superficie-solida)] px-3 py-2 text-xs"
                        >
                          <p className="font-semibold text-[var(--texto)]">{evt.resumo}</p>
                          <p className="text-[var(--texto-sec)]">
                            {evt.autorNome} · {formatarHorarioAtividade(evt.criadoEm)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {erroAcao ? (
                  <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
                    {erroAcao}
                  </p>
                ) : null}

                {feedback ? (
                  <p role="status" className="text-xs font-semibold text-[var(--sucesso)]">
                    {feedback}
                  </p>
                ) : null}

                <div className="flex justify-end border-t border-[var(--borda)] pt-4">
                  <Botao
                    type="button"
                    variante="perigo"
                    tamanho="sm"
                    reduzirMovimento={reduzirMovimento}
                    disabled={ocupado}
                    onClick={() => {
                      void (async () => {
                        setErroAcao(null);
                        setOcupado(true);
                        try {
                          await servicoGrupos.sairDoGrupo(painel.tarefaRaizId);
                          await aoSairDoGrupo(painel.tarefaRaizId);
                          aoFechar();
                        } catch (falha) {
                          setErroAcao(
                            falha instanceof ErroApi
                              ? falha.mensagem
                              : 'Não foi possível sair do grupo.',
                          );
                        } finally {
                          setOcupado(false);
                        }
                      })();
                    }}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sair do grupo</span>
                  </Botao>
                </div>
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
