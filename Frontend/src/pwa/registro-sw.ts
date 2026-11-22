export async function registrarServiceWorker(
  navegador?: Navigator,
): Promise<ServiceWorkerRegistration | null> {
  const nav = navegador ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  if (!nav || !('serviceWorker' in nav) || !nav.serviceWorker) {
    return null;
  }

  try {
    return await nav.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}
