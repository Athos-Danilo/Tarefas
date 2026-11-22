import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, LogOut, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { useAutenticacao } from '../../hooks/usar-autenticacao';
import { ModalExclusaoConta } from './ModalExclusaoConta';
import { SeletorAvatar } from './SeletorAvatar';
import { esquemaPerfil, type ValoresPerfilForm } from './catalogo-avatares';

export interface PropriedadesPaginaPerfil {
  reduzirMovimento: boolean;
}

export function PaginaPerfil({ reduzirMovimento }: PropriedadesPaginaPerfil) {
  const { estadoSessao, servico, definirSessao, solicitarRevisaoTutorial } = useAutenticacao();
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [avisoTutorial, setAvisoTutorial] = useState<string | null>(null);
  const [encerrandoSessoes, setEncerrandoSessoes] = useState(false);
  const [urlPreviewUpload, setUrlPreviewUpload] = useState<string | null>(null);
  const navegar = useNavigate();

  const usuarioAtual = estadoSessao.autenticado ? estadoSessao.usuario : null;

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ValoresPerfilForm>({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: {
      nomeExibicao: usuarioAtual?.nomeExibicao ?? '',
      avatarTipo: usuarioAtual?.avatarTipo ?? 'preset',
      avatarId: usuarioAtual?.avatarId ?? 'sol-nascente',
    },
  });

  const avatarTipo = useWatch({ control, name: 'avatarTipo' });
  const avatarId = useWatch({ control, name: 'avatarId' });

  if (!estadoSessao.autenticado || !usuarioAtual) {
    return null;
  }

  const lidarSalvarPerfil = handleSubmit(async (valores) => {
    setMensagemSucesso(null);
    setErroPerfil(null);
    try {
      const atualizado = await servico.atualizarPerfil({
        nomeExibicao: valores.nomeExibicao,
        avatarTipo: valores.avatarTipo,
        avatarId: valores.avatarTipo === 'preset' ? valores.avatarId : null,
      });
      definirSessao({
        ...estadoSessao,
        usuario: atualizado,
      });
      setMensagemSucesso('Perfil atualizado com sucesso.');
    } catch (erro) {
      setErroPerfil(erro instanceof Error ? erro.message : 'Nao foi possivel salvar o perfil.');
    }
  });

  const lidarSairTodos = async () => {
    setEncerrandoSessoes(true);
    try {
      await servico.sairTodos();
    } finally {
      definirSessao({ autenticado: false, usuario: null, sessao: null });
      setEncerrandoSessoes(false);
      void navegar('/', { replace: true });
    }
  };

  const lidarSairAtual = async () => {
    setEncerrandoSessoes(true);
    try {
      await servico.sair();
    } finally {
      definirSessao({ autenticado: false, usuario: null, sessao: null });
      setEncerrandoSessoes(false);
      void navegar('/', { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <CartaoBento destacado className="space-y-6">
        <div className="border-b border-[var(--borda)] pb-4">
          <h1 className="fonte-display text-2xl font-bold text-[var(--texto)]">
            Meu perfil e conta
          </h1>
          <p className="text-sm text-[var(--texto-sec)]">
            Gerencie sua identidade visual, sessões conectadas e preferências da conta.
          </p>
        </div>

        <form
          onSubmit={(evento) => {
            void lidarSalvarPerfil(evento);
          }}
          className="space-y-5"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="campo-email-google"
                className="block text-sm font-semibold text-[var(--texto)]"
              >
                E-mail Google vinculado
              </label>
              <input
                id="campo-email-google"
                type="email"
                readOnly
                value={usuarioAtual.email}
                className="w-full cursor-default rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3.5 py-2.5 text-sm text-[var(--texto-sec)]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="campo-nome-perfil"
                className="block text-sm font-semibold text-[var(--texto)]"
              >
                Nome de exibição
              </label>
              <input
                id="campo-nome-perfil"
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
              definirSessao({
                ...estadoSessao,
                usuario: {
                  ...usuarioAtual,
                  avatarTipo: 'upload',
                  avatarId: null,
                  avatarUrl: res.avatarUrl,
                },
              });
            }}
          />

          {erroPerfil ? (
            <p role="alert" className="text-sm font-semibold text-[var(--erro)]">
              {erroPerfil}
            </p>
          ) : null}

          {mensagemSucesso ? (
            <p role="status" className="text-sm font-semibold text-[var(--sucesso)]">
              {mensagemSucesso}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Botao
              type="submit"
              variante="primario"
              disabled={isSubmitting}
              reduzirMovimento={reduzirMovimento}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </Botao>
          </div>
        </form>
      </CartaoBento>

      <CartaoBento className="space-y-4">
        <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
          Tutorial e sessões ativas
        </h2>
        <div className="flex flex-wrap gap-3">
          <Botao
            variante="secundario"
            reduzirMovimento={reduzirMovimento}
            onClick={() => {
              solicitarRevisaoTutorial();
              setAvisoTutorial('Modo tutorial marcado para exibição ao voltar para sua Jornada.');
            }}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Rever tutorial
          </Botao>

          <Botao
            variante="secundario"
            disabled={encerrandoSessoes}
            reduzirMovimento={reduzirMovimento}
            onClick={() => {
              void lidarSairAtual();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair deste aparelho
          </Botao>

          <Botao
            variante="secundario"
            disabled={encerrandoSessoes}
            reduzirMovimento={reduzirMovimento}
            onClick={() => {
              void lidarSairTodos();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair de todos os aparelhos
          </Botao>
        </div>
        {avisoTutorial ? (
          <p role="status" className="text-xs font-semibold text-[var(--primaria)]">
            {avisoTutorial}
          </p>
        ) : null}
      </CartaoBento>

      <CartaoBento className="space-y-3 border-[var(--erro)]">
        <div className="flex items-center gap-2 text-[var(--erro)]">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          <h2 className="fonte-display text-lg font-bold">Zona de perigo</h2>
        </div>
        <p className="text-sm text-[var(--texto-sec)]">
          Ao excluir sua conta, todos os dados pessoais e tarefas são removidos permanentemente sem
          possibilidade de recuperação.
        </p>
        <ModalExclusaoConta
          reduzirMovimento={reduzirMovimento}
          aoConfirmarExclusao={async (confirmacao) => {
            await servico.excluirConta(confirmacao);
            definirSessao({ autenticado: false, usuario: null, sessao: null });
            void navegar('/', { replace: true });
          }}
        />
      </CartaoBento>
    </div>
  );
}
