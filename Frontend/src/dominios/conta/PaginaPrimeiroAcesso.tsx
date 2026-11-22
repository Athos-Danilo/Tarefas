import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { SeloMarcaLume } from '../../componentes/SeloMarcaLume';
import { useAutenticacao } from '../../hooks/usar-autenticacao';
import type { FaixaFavicon } from '../../astronomia/tipos';
import { SeletorAvatar } from './SeletorAvatar';
import { esquemaPrimeiroAcesso, type ValoresPrimeiroAcessoForm } from './catalogo-avatares';

export interface PropriedadesPaginaPrimeiroAcesso {
  faixaFavicon: FaixaFavicon;
  reduzirMovimento: boolean;
}

export function PaginaPrimeiroAcesso({
  faixaFavicon,
  reduzirMovimento,
}: PropriedadesPaginaPrimeiroAcesso) {
  const { estadoSessao, servico, definirSessao } = useAutenticacao();
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [urlPreviewUpload, setUrlPreviewUpload] = useState<string | null>(null);
  const navegar = useNavigate();

  const usuarioAtual = estadoSessao.autenticado ? estadoSessao.usuario : null;

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ValoresPrimeiroAcessoForm>({
    resolver: zodResolver(esquemaPrimeiroAcesso),
    defaultValues: {
      nomeExibicao: usuarioAtual?.nomeExibicao ?? '',
      avatarTipo: usuarioAtual?.avatarTipo ?? 'preset',
      avatarId: usuarioAtual?.avatarId ?? 'sol-nascente',
      criarArvoreGuia: true,
    },
  });

  const avatarTipo = useWatch({ control, name: 'avatarTipo' });
  const avatarId = useWatch({ control, name: 'avatarId' });

  if (!estadoSessao.autenticado || !usuarioAtual) {
    return null;
  }

  const lidarEnvio = handleSubmit(async (valores) => {
    setErroEnvio(null);
    try {
      await servico.concluirPrimeiroAcesso({
        nomeExibicao: valores.nomeExibicao,
        avatarTipo: valores.avatarTipo,
        avatarId: valores.avatarTipo === 'preset' ? valores.avatarId : null,
        criarArvoreGuia: valores.criarArvoreGuia,
      });

      const novaUrlAvatar =
        valores.avatarTipo === 'preset' && valores.avatarId
          ? `/assets-3d/avatares/${valores.avatarId}.png`
          : (urlPreviewUpload ?? usuarioAtual.avatarUrl);

      definirSessao({
        ...estadoSessao,
        usuario: {
          ...usuarioAtual,
          nomeExibicao: valores.nomeExibicao,
          avatarTipo: valores.avatarTipo,
          avatarId: valores.avatarTipo === 'preset' ? valores.avatarId : null,
          avatarUrl: novaUrlAvatar,
          primeiroAcessoConcluido: true,
        },
      });
      void navegar('/jornada', { replace: true });
    } catch (erro) {
      setErroEnvio(
        erro instanceof Error ? erro.message : 'Nao foi possivel concluir o primeiro acesso.',
      );
    }
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-4 py-10">
      <CartaoBento destacado className="space-y-6">
        <div className="space-y-2 border-b border-[var(--borda)] pb-4">
          <SeloMarcaLume faixaFavicon={faixaFavicon} />
          <h1 className="fonte-display pt-2 text-2xl font-bold text-[var(--texto)]">
            Boas-vindas ao Lume
          </h1>
          <p className="text-sm text-[var(--texto-sec)]">
            Personalize seu nome de exibição e avatar antes de abrir sua Jornada do Dia.
          </p>
        </div>

        <form
          onSubmit={(evento) => {
            void lidarEnvio(evento);
          }}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="campo-nome-primeiro-acesso"
              className="block text-sm font-semibold text-[var(--texto)]"
            >
              Nome de exibição
            </label>
            <input
              id="campo-nome-primeiro-acesso"
              type="text"
              {...register('nomeExibicao')}
              className="w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3.5 py-2.5 text-sm text-[var(--texto)]"
            />
            {errors.nomeExibicao ? (
              <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
                {errors.nomeExibicao.message}
              </p>
            ) : null}
          </div>

          <SeletorAvatar
            avatarTipo={avatarTipo}
            avatarId={avatarId}
            avatarUrlAtual={urlPreviewUpload ?? usuarioAtual.avatarUrl}
            aoSelecionarPreset={(id) => {
              setValue('avatarTipo', 'preset', { shouldValidate: true });
              setValue('avatarId', id, { shouldValidate: true });
            }}
            aoSelecionarGoogle={() => {
              setValue('avatarTipo', 'google', { shouldValidate: true });
              setValue('avatarId', null, { shouldValidate: true });
            }}
            aoEnviarUpload={async (arquivo) => {
              const res = await servico.enviarAvatar(arquivo);
              setUrlPreviewUpload(res.avatarUrl);
              setValue('avatarTipo', 'upload', { shouldValidate: true });
              setValue('avatarId', null, { shouldValidate: true });
            }}
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3.5">
            <input
              type="checkbox"
              {...register('criarArvoreGuia')}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primaria)]"
            />
            <span className="text-sm text-[var(--texto)]">
              <strong className="font-semibold">Criar árvore-guia de boas-vindas editável</strong>
              <span className="block text-xs text-[var(--texto-sec)]">
                Inclui uma tarefa composta de exemplo mostrando prioridades e níveis (pode editar ou
                excluir depois).
              </span>
            </span>
          </label>

          {erroEnvio ? (
            <p role="alert" className="text-sm font-semibold text-[var(--erro)]">
              {erroEnvio}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Botao
              type="submit"
              variante="primario"
              tamanho="lg"
              disabled={isSubmitting}
              reduzirMovimento={reduzirMovimento}
            >
              {isSubmitting ? 'Preparando jornada...' : 'Começar minha jornada'}
            </Botao>
          </div>
        </form>
      </CartaoBento>
    </main>
  );
}
