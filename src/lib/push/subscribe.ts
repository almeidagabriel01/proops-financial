/**
 * Helper de cliente para solicitar permissão e registrar a subscription de push.
 * Chamado pelo PushPermissionBanner após o usuário clicar em "Ativar".
 *
 * Retorna true se a subscription foi salva com sucesso no servidor.
 * Retorna false se o browser não suporta push, VAPID não está configurado
 * ou o servidor retornou erro.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.ready;

  // Reutilizar subscription existente se já houver uma ativa
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
  }

  const json = subscription.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });

  return res.ok;
}
