import { Check, Upload } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { AbasAcessiveis } from '../../componentes/AbasAcessiveis';
import type { TipoAvatar } from '../../servicos/tipos-conta';
import { CATALOGO_AVATARES_OFICIAIS, validarArquivoAvatarLocal } from './catalogo-avatares';

export interface PropriedadesSeletorAvatar {
  avatarTipo: TipoAvatar;
  avatarId: string | null;
  avatarUrlAtual: string | null;
  fotoGoogleDisponivel?: boolean;
  aoSelecionarPreset: (id: string) => void;
  aoSelecionarGoogle: () => void;
  aoEnviarUpload: (arquivo: File) => Promise<void>;
}

export function SeletorAvatar({
  avatarTipo,
  avatarId,
  avatarUrlAtual,
  fotoGoogleDisponivel = true,
  aoSelecionarPreset,
  aoSelecionarGoogle,
  aoEnviarUpload,
}: PropriedadesSeletorAvatar) {
  const [abaAtiva, setAbaAtiva] = useState<TipoAvatar>(avatarTipo);
  const [enviandoUpload, setEnviandoUpload] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [sucessoUpload, setSucessoUpload] = useState<string | null>(null);

  const urlPrevia =
    avatarTipo === 'preset' && avatarId
      ? `/assets-3d/avatares/${avatarId}.png`
      : (avatarUrlAtual ?? '/assets-3d/avatares/sol-nascente.png');

  const lidarMudancaArquivo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) {
      return;
    }
    setErroUpload(null);
    setSucessoUpload(null);

    const erroLocal = validarArquivoAvatarLocal(arquivo);
    if (erroLocal) {
      setErroUpload(erroLocal);
      return;
    }

    setEnviandoUpload(true);
    try {
      await aoEnviarUpload(arquivo);
      setSucessoUpload('Imagem enviada e padronizada em 256x256 WebP.');
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Nao foi possivel enviar a imagem.';
      setErroUpload(mensagem);
    } finally {
      setEnviandoUpload(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3">
        <img
          src={urlPrevia}
          alt="Prévia do avatar selecionado"
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-full border border-[var(--borda)] object-cover"
        />
        <div className="text-xs text-[var(--texto-sec)]">
          <p className="font-semibold text-[var(--texto)]">Prévia ativa do perfil</p>
          <p>Escolha um dos 16 estilos Soft-3D, sua foto do Google ou envie uma imagem própria.</p>
        </div>
      </div>

      <AbasAcessiveis
        rotuloGrupo="Tipo de avatar"
        valorAtivo={abaAtiva}
        aoMudarValor={(valor) => {
          const proximo = valor as TipoAvatar;
          setAbaAtiva(proximo);
          if (proximo === 'google' && fotoGoogleDisponivel) {
            aoSelecionarGoogle();
          }
        }}
        itens={[
          {
            valor: 'preset',
            rotulo: '16 Avatares Soft-3D',
            conteudo: (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {CATALOGO_AVATARES_OFICIAIS.map((item) => {
                  const selecionado = avatarTipo === 'preset' && avatarId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={item.nome}
                      aria-pressed={selecionado}
                      onClick={() => aoSelecionarPreset(item.id)}
                      className={`relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition-colors ${
                        selecionado
                          ? 'border-[var(--primaria)] bg-[var(--superficie)] ring-2 ring-[var(--primaria)]'
                          : 'border-[var(--borda)] bg-[var(--superficie-alt)] hover:opacity-95'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={item.nome}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-[var(--texto)]">{item.nome}</span>
                      <span className="text-[11px] text-[var(--texto-sec)]">{item.categoria}</span>
                      {selecionado ? (
                        <Check
                          className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-[var(--primaria)]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ),
          },
          {
            valor: 'google',
            rotulo: 'Foto do Google',
            conteudo: (
              <div className="space-y-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4 text-sm">
                <p className="text-[var(--texto-sec)]">
                  Utilizar a foto de perfil vinculada à sua conta Google.
                </p>
                <button
                  type="button"
                  disabled={!fotoGoogleDisponivel}
                  onClick={aoSelecionarGoogle}
                  className="min-h-11 cursor-pointer rounded-xl bg-[var(--primaria)] px-4 py-2 text-xs font-semibold text-[var(--primaria-texto)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Usar foto da conta Google
                </button>
              </div>
            ),
          },
          {
            valor: 'upload',
            rotulo: 'Enviar imagem própria',
            conteudo: (
              <div className="space-y-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4 text-sm">
                <label
                  htmlFor="input-upload-avatar"
                  className="flex cursor-pointer items-center gap-2 font-semibold text-[var(--texto)]"
                >
                  <Upload className="h-4 w-4 text-[var(--primaria)]" aria-hidden="true" />
                  <span>Arquivo de avatar (PNG, JPG ou WebP até 2 MB)</span>
                </label>
                <input
                  id="input-upload-avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={enviandoUpload}
                  onChange={(evento) => {
                    void lidarMudancaArquivo(evento);
                  }}
                  className="block w-full text-xs text-[var(--texto-sec)] file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-[var(--borda)] file:bg-[var(--superficie-solida)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--texto)]"
                />
                {enviandoUpload ? (
                  <p className="text-xs font-medium text-[var(--texto-sec)]">
                    Processando e enviando avatar...
                  </p>
                ) : null}
                {erroUpload ? (
                  <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
                    {erroUpload}
                  </p>
                ) : null}
                {sucessoUpload ? (
                  <p role="status" className="text-xs font-semibold text-[var(--sucesso)]">
                    {sucessoUpload}
                  </p>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
