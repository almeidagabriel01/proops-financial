import webpush from 'web-push';

// Inicialização lazy: setVapidDetails é chamado apenas na primeira invocação de
// sendPushNotification(), não no import do módulo. Isso evita crash durante next build
// quando as variáveis VAPID não estão disponíveis no ambiente de CI/build.

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  if (
    !process.env.VAPID_SUBJECT ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    throw new Error('Push não configurado: variáveis VAPID ausentes.');
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  initialized = true;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
): Promise<void> {
  ensureInitialized();
  await webpush.sendNotification(subscription, payload);
}

export { webpush };
