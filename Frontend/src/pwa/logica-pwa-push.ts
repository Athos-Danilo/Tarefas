import type { PlataformaPush } from '../servicos/tipos-push';

export interface EventoAntesInstalarPwa extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function estaEmModoStandalone(
  matchMediaStandalone: boolean,
  navigatorStandalone: boolean,
): boolean {
  return Boolean(matchMediaStandalone || navigatorStandalone);
}

export function ehDispositivoIos(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return true;
  }
  // iPadOS Safari moderno reporta Macintosh no userAgent com tela multi-toque.
  return /macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function exigeInstalacaoIosParaPush(
  userAgent: string,
  maxTouchPoints: number,
  emStandalone: boolean,
): boolean {
  return ehDispositivoIos(userAgent, maxTouchPoints) && !emStandalone;
}

export function detectarPlataformaDispositivo(
  userAgent: string,
  maxTouchPoints = 0,
): PlataformaPush {
  if (ehDispositivoIos(userAgent, maxTouchPoints)) {
    return 'ios';
  }
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  if (/windows|macintosh|linux|cros|x11/i.test(userAgent)) {
    return 'desktop';
  }
  return 'outro';
}

export function sugerirRotuloDispositivo(plataforma: PlataformaPush): string {
  switch (plataforma) {
    case 'ios':
      return 'iPhone / iPad';
    case 'android':
      return 'Celular Android';
    case 'desktop':
      return 'Navegador no computador';
    default:
      return 'Este aparelho';
  }
}

export function converterChaveVapidParaUint8Array(chaveBase64Url: string): Uint8Array<ArrayBuffer> {
  const limpa = chaveBase64Url.trim();
  const padding = '='.repeat((4 - (limpa.length % 4)) % 4);
  const base64Padrao = (limpa + padding).replaceAll('-', '+').replaceAll('_', '/');
  const decodificada = atob(base64Padrao);
  const buffer = new ArrayBuffer(decodificada.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < decodificada.length; i += 1) {
    bytes[i] = decodificada.charCodeAt(i);
  }
  return bytes;
}

export function extrairChavesInscricaoPush(assinatura: PushSubscription): {
  endpoint: string;
  chaves: { p256dh: string; auth: string };
} {
  const json = assinatura.toJSON();
  const endpoint = json.endpoint ?? assinatura.endpoint;
  const p256dh = json.keys?.p256dh ?? '';
  const auth = json.keys?.auth ?? '';
  if (!endpoint || !p256dh || !auth) {
    throw new Error('O navegador nao retornou as chaves completas de Web Push (p256dh/auth).');
  }
  return {
    endpoint,
    chaves: { p256dh, auth },
  };
}

export function calcularInstanteDisparoLembrete(
  prazoIso: string | null,
  antecedenciaMin: number,
): string | null {
  if (!prazoIso || antecedenciaMin < 0) {
    return null;
  }
  const timestamp = Date.parse(prazoIso);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp - antecedenciaMin * 60_000).toISOString();
}
