import {
  Bell,
  BellOff,
  CheckCircle2,
  Download,
  Laptop,
  PlusSquare,
  Share,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import {
  converterChaveVapidParaUint8Array,
  detectarPlataformaDispositivo,
  estaEmModoStandalone,
  exigeInstalacaoIosParaPush,
  extrairChavesInscricaoPush,
  sugerirRotuloDispositivo,
  type EventoAntesInstalarPwa,
} from '../../pwa/logica-pwa-push';
import { criarServicoPush } from '../../servicos/cliente-push';
import type { DispositivoPush, ServicoPushFrontend } from '../../servicos/tipos-push';

export interface PropriedadesPainelPwaEWebPush {
  servicoPush?: ServicoPushFrontend;
  reduzirMovimento: boolean;
}

function obterAmbientePwaAtual() {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const maxTouchPoints = typeof navigator !== 'undefined' ? (navigator.maxTouchPoints ?? 0) : 0;
  const matchStandalone =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
  const navStandalone =
    typeof navigator !== 'undefined' &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const emStandalone = estaEmModoStandalone(matchStandalone, navStandalone);
  const plataforma = detectarPlataformaDispositivo(userAgent, maxTouchPoints);
  const precisaGuiaIos = exigeInstalacaoIosParaPush(userAgent, maxTouchPoints, emStandalone);

  const suporteWebPush =
    typeof globalThis !== 'undefined' &&
    'Notification' in globalThis &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in globalThis;

  return {
    emStandalone,
    plataforma,
    precisaGuiaIos,
    suporteWebPush,
  };
}

export function PainelPwaEWebPush({
  servicoPush,
  reduzirMovimento,
}: PropriedadesPainelPwaEWebPush) {
  const servicoEfetivo = useMemo(() => servicoPush ?? criarServicoPush(), [servicoPush]);
  const ambiente = obterAmbientePwaAtual();

  const [eventoInstalacao, setEventoInstalacao] = useState<EventoAntesInstalarPwa | null>(null);
  const [instaladoFeedback, setInstaladoFeedback] = useState(false);

  const [chaveVapid, setChaveVapid] = useState<string | null>(null);
  const [pushHabilitadoApi, setPushHabilitadoApi] = useState(false);
  const [dispositivos, setDispositivos] = useState<DispositivoPush[]>([]);
  const [limiteDispositivos, setLimiteDispositivos] = useState(10);
  const [rotuloDispositivo, setRotuloDispositivo] = useState(() =>
    sugerirRotuloDispositivo(ambiente.plataforma),
  );
  const [ativandoPush, setAtivandoPush] = useState(false);
  const [revogandoId, setRevogandoId] = useState<string | null>(null);
  const [erroPush, setErroPush] = useState<string | null>(null);
  const [sucessoPush, setSucessoPush] = useState<string | null>(null);

  useEffect(() => {
    const aoAntesInstalar = (evento: Event) => {
      evento.preventDefault();
      setEventoInstalacao(evento as EventoAntesInstalarPwa);
    };
    const aoInstalado = () => {
      setEventoInstalacao(null);
      setInstaladoFeedback(true);
    };
    window.addEventListener('beforeinstallprompt', aoAntesInstalar);
    window.addEventListener('appinstalled', aoInstalado);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoAntesInstalar);
      window.removeEventListener('appinstalled', aoInstalado);
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    async function carregarPush() {
      try {
        const [respostaChave, respostaLista] = await Promise.all([
          servicoEfetivo.obterChavePublica(),
          servicoEfetivo.listarDispositivos(),
        ]);
        if (!ativo) {
          return;
        }
        setChaveVapid(respostaChave.chavePublica);
        setPushHabilitadoApi(respostaChave.habilitado);
        setDispositivos(respostaLista.itens);
        setLimiteDispositivos(respostaLista.limiteMaximo);
      } catch {
        // Degrada silenciosamente caso o servidor VAPID esteja indisponivel no momento.
      }
    }
    void carregarPush();
    return () => {
      ativo = false;
    };
  }, [servicoEfetivo]);

  const lidarInstalarPwa = async () => {
    if (!eventoInstalacao) {
      return;
    }
    try {
      await eventoInstalacao.prompt();
      const escolha = await eventoInstalacao.userChoice;
      if (escolha.outcome === 'accepted') {
        setInstaladoFeedback(true);
      }
      setEventoInstalacao(null);
    } catch {
      setErroPush('Não foi possível abrir o instalador do navegador.');
    }
  };

  const lidarAtivarPush = async () => {
    setErroPush(null);
    setSucessoPush(null);

    if (!ambiente.suporteWebPush) {
      setErroPush('Este navegador não oferece suporte completo a notificações Web Push.');
      return;
    }
    if (!pushHabilitadoApi || !chaveVapid) {
      setErroPush('As chaves VAPID ainda não foram configuradas no servidor.');
      return;
    }

    setAtivandoPush(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setErroPush(
          'Permissão de notificação recusada. Você pode liberar nas configurações do navegador quando quiser.',
        );
        return;
      }

      const registroSw = await navigator.serviceWorker.ready;
      const existente = await registroSw.pushManager.getSubscription();
      const assinatura =
        existente ??
        (await registroSw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: converterChaveVapidParaUint8Array(chaveVapid),
        }));

      const dadosAssinatura = extrairChavesInscricaoPush(assinatura);
      const registrado = await servicoEfetivo.registrarDispositivo({
        endpoint: dadosAssinatura.endpoint,
        chaves: dadosAssinatura.chaves,
        rotuloDispositivo: rotuloDispositivo.trim() || null,
        plataforma: ambiente.plataforma,
      });

      setDispositivos((atuais) => {
        const filtrados = atuais.filter((item) => item.id !== registrado.id);
        return [registrado, ...filtrados];
      });
      setSucessoPush('Notificações Web Push ativadas para este aparelho.');
    } catch (erro) {
      setErroPush(
        erro instanceof Error ? erro.message : 'Não foi possível ativar notificações Web Push.',
      );
    } finally {
      setAtivandoPush(false);
    }
  };

  const lidarRevogarDispositivo = async (dispositivoId: string) => {
    setErroPush(null);
    setSucessoPush(null);
    setRevogandoId(dispositivoId);
    try {
      await servicoEfetivo.revogarDispositivo(dispositivoId);
      setDispositivos((atuais) => atuais.filter((item) => item.id !== dispositivoId));
      setSucessoPush('Aparelho desconectado das notificações Web Push.');
    } catch (erro) {
      setErroPush(
        erro instanceof Error ? erro.message : 'Não foi possível revogar o aparelho selecionado.',
      );
    } finally {
      setRevogandoId(null);
    }
  };

  return (
    <CartaoBento className="space-y-5">
      <div className="border-b border-[var(--borda)] pb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--primaria)]" aria-hidden="true" />
          <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
            Aplicativo (PWA) e notificações Web Push
          </h2>
        </div>
        <p className="mt-1 text-sm text-[var(--texto-sec)]">
          Instale o Lume no computador ou celular com o ícone Sol de 4 Ls e ative lembretes nativos
          e avisos de Tarefas em Conjunto em cada aparelho por sua escolha.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/favicons/favicon-lume-manha.png"
              alt="Ícone do aplicativo Lume"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl border border-[var(--borda)] object-cover"
            />
            <div>
              <p className="text-sm font-bold text-[var(--texto)]">
                {ambiente.emStandalone || instaladoFeedback
                  ? 'Aplicativo Lume instalado'
                  : 'Instalar Lume como aplicativo'}
              </p>
              <p className="text-xs text-[var(--texto-sec)]">
                {ambiente.emStandalone || instaladoFeedback
                  ? 'Rodando em janela própria sem barra de navegador.'
                  : 'Acesso rápido direto da tela inicial ou área de trabalho.'}
              </p>
            </div>
          </div>

          {eventoInstalacao ? (
            <Botao
              type="button"
              variante="primario"
              tamanho="sm"
              reduzirMovimento={reduzirMovimento}
              onClick={() => {
                void lidarInstalarPwa();
              }}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Instalar aplicativo Lume</span>
            </Botao>
          ) : ambiente.emStandalone || instaladoFeedback ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Modo aplicativo ativo
            </span>
          ) : null}
        </div>

        {ambiente.precisaGuiaIos ? (
          <div className="mt-4 space-y-2 rounded-xl border border-[var(--primaria)]/40 bg-[var(--superficie-solida)] p-3.5">
            <h3 className="text-sm font-bold text-[var(--texto)]">
              Guia rápido para iPhone e iPad (iOS 16.4+)
            </h3>
            <p className="text-xs text-[var(--texto-sec)]">
              No Safari do iOS, adicione o Lume à tela de início antes de habilitar alertas Web
              Push:
            </p>
            <ol className="space-y-2 text-xs text-[var(--texto)]">
              <li className="flex items-center gap-2">
                <Share className="h-4 w-4 shrink-0 text-[var(--primaria)]" aria-hidden="true" />
                <span>
                  <strong>Passo 1:</strong> Toque em Compartilhar na barra do Safari.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <PlusSquare
                  className="h-4 w-4 shrink-0 text-[var(--primaria)]"
                  aria-hidden="true"
                />
                <span>
                  <strong>Passo 2:</strong> Selecione Adicionar à Tela de Início e abra o Lume pelo
                  ícone instalado.
                </span>
              </li>
            </ol>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <label
              htmlFor="campo-rotulo-dispositivo"
              className="block text-xs font-semibold text-[var(--texto-sec)]"
            >
              Nome deste aparelho
            </label>
            <input
              id="campo-rotulo-dispositivo"
              type="text"
              maxLength={80}
              value={rotuloDispositivo}
              onChange={(evento) => setRotuloDispositivo(evento.target.value)}
              placeholder="Ex.: Notebook de estudos ou Celular"
              className="min-h-10 w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-1.5 text-sm text-[var(--texto)]"
            />
          </div>

          <Botao
            type="button"
            variante="secundario"
            disabled={ativandoPush || ambiente.precisaGuiaIos}
            reduzirMovimento={reduzirMovimento}
            onClick={() => {
              void lidarAtivarPush();
            }}
          >
            {ativandoPush ? (
              <Bell className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Bell className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{ativandoPush ? 'Ativando...' : 'Ativar notificações neste aparelho'}</span>
          </Botao>
        </div>

        {!ambiente.suporteWebPush ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--texto-sec)]">
            <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Navegador atual sem Service Worker/PushManager ativo para alertas push.</span>
          </p>
        ) : null}

        {erroPush ? (
          <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
            {erroPush}
          </p>
        ) : null}

        {sucessoPush ? (
          <p role="status" className="text-xs font-semibold text-[var(--sucesso)]">
            {sucessoPush}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-[var(--borda)] pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--texto)]">Aparelhos conectados</h3>
          <span className="font-mono text-xs text-[var(--texto-sec)]">
            {dispositivos.length}/{limiteDispositivos}
          </span>
        </div>

        {dispositivos.length === 0 ? (
          <p className="text-xs text-[var(--texto-sec)]">
            Nenhum aparelho autorizado ainda. As notificações permanecem desligadas até você ativar
            acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {dispositivos.map((disp) => {
              const Icone = disp.plataforma === 'desktop' ? Laptop : Smartphone;
              return (
                <li
                  key={disp.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Icone className="h-4 w-4 text-[var(--primaria)]" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--texto)]">
                        {disp.rotuloDispositivo}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--texto-sec)]">
                        Plataforma: {disp.plataforma}
                      </p>
                    </div>
                  </div>

                  <Botao
                    type="button"
                    variante="fantasma"
                    tamanho="sm"
                    disabled={revogandoId === disp.id}
                    aria-label={`Revogar ${disp.rotuloDispositivo}`}
                    reduzirMovimento={reduzirMovimento}
                    onClick={() => {
                      void lidarRevogarDispositivo(disp.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[var(--erro)]" aria-hidden="true" />
                    <span>{revogandoId === disp.id ? 'Removendo...' : 'Revogar'}</span>
                  </Botao>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CartaoBento>
  );
}
