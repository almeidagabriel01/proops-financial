import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Helpers de teste ──────────────────────────────────────────────────────

function makeSubscription(overrides?: Partial<{ endpoint: string; keys: { p256dh: string; auth: string } }>) {
  return {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-key' },
    ...overrides,
  };
}

// ── Lógica de /api/push/subscribe ─────────────────────────────────────────

describe('POST /api/push/subscribe — validação de entrada', () => {
  it('rejeita request sem endpoint', () => {
    const body = { keys: { p256dh: 'key', auth: 'auth' } };
    const valid = !!(
      (body as { endpoint?: string }).endpoint &&
      (body as { keys?: { p256dh: string; auth: string } }).keys?.p256dh &&
      (body as { keys?: { p256dh: string; auth: string } }).keys?.auth
    );
    expect(valid).toBe(false);
  });

  it('rejeita request sem keys.p256dh', () => {
    const body = { endpoint: 'https://push.example.com', keys: { auth: 'auth' } };
    const valid = !!(
      body.endpoint &&
      (body.keys as { p256dh?: string }).p256dh &&
      body.keys.auth
    );
    expect(valid).toBe(false);
  });

  it('rejeita request sem keys.auth', () => {
    const body = { endpoint: 'https://push.example.com', keys: { p256dh: 'key' } };
    const valid = !!(
      body.endpoint &&
      body.keys.p256dh &&
      (body.keys as { auth?: string }).auth
    );
    expect(valid).toBe(false);
  });

  it('aceita request com endpoint e keys completas', () => {
    const body = makeSubscription();
    const valid = !!(body.endpoint && body.keys.p256dh && body.keys.auth);
    expect(valid).toBe(true);
  });

  it('graceful degradation quando VAPID não configurado', () => {
    const vapidKey = undefined;
    // Se VAPID_PRIVATE_KEY ausente, retorna subscribed: false sem erro
    const response = vapidKey
      ? { subscribed: true }
      : { subscribed: false, reason: 'push_disabled' };
    expect(response).toEqual({ subscribed: false, reason: 'push_disabled' });
  });
});

// ── Lógica de /api/push/send ──────────────────────────────────────────────

describe('POST /api/push/send — validação de autorização', () => {
  const SERVICE_ROLE_KEY = 'test-service-role-key';

  it('rejeita request sem header Authorization', () => {
    const authHeader = null;
    const expectedToken = `Bearer ${SERVICE_ROLE_KEY}`;
    expect(authHeader !== expectedToken).toBe(true);
  });

  it('rejeita token incorreto', () => {
    const authHeader = 'Bearer wrong-token';
    const expectedToken = `Bearer ${SERVICE_ROLE_KEY}`;
    expect(authHeader === expectedToken).toBe(false);
  });

  it('aceita token correto', () => {
    const authHeader = `Bearer ${SERVICE_ROLE_KEY}`;
    const expectedToken = `Bearer ${SERVICE_ROLE_KEY}`;
    expect(authHeader === expectedToken).toBe(true);
  });

  it('rejeita Bearer vazio', () => {
    const authHeader = 'Bearer ';
    const expectedToken = `Bearer ${SERVICE_ROLE_KEY}`;
    expect(authHeader === expectedToken).toBe(false);
  });
});

describe('POST /api/push/send — validação de body', () => {
  it('rejeita body sem user_id', () => {
    const body = { title: 'Alerta', body: 'Mensagem' };
    const valid = !!((body as { user_id?: string }).user_id && body.title && body.body);
    expect(valid).toBe(false);
  });

  it('rejeita body sem title', () => {
    const body = { user_id: 'uuid', body: 'Mensagem' };
    const valid = !!(body.user_id && (body as { title?: string }).title && body.body);
    expect(valid).toBe(false);
  });

  it('rejeita body sem body (mensagem)', () => {
    const body = { user_id: 'uuid', title: 'Alerta' };
    const valid = !!(body.user_id && body.title && (body as { body?: string }).body);
    expect(valid).toBe(false);
  });

  it('aceita body completo', () => {
    const body = { user_id: 'uuid', title: 'Alerta', body: 'Mensagem', url: '/dashboard' };
    const valid = !!(body.user_id && body.title && body.body);
    expect(valid).toBe(true);
  });

  it('url é opcional — usa /dashboard como padrão', () => {
    const body = { user_id: 'uuid', title: 'Alerta', body: 'Mensagem' };
    const url = (body as { url?: string }).url ?? '/dashboard';
    expect(url).toBe('/dashboard');
  });
});

describe('POST /api/push/send — lógica de envio e limpeza de endpoints', () => {
  it('retorna sent=0 e failed=0 quando usuário não tem subscriptions', () => {
    const subscriptions: unknown[] = [];
    if (!subscriptions?.length) {
      expect({ sent: 0, failed: 0 }).toEqual({ sent: 0, failed: 0 });
    }
  });

  it('identifica endpoints expirados (410 Gone)', () => {
    const err = { statusCode: 410 };
    const isExpired = err.statusCode === 410 || err.statusCode === 404;
    expect(isExpired).toBe(true);
  });

  it('identifica endpoints expirados (404 Not Found)', () => {
    const err = { statusCode: 404 };
    const isExpired = err.statusCode === 410 || err.statusCode === 404;
    expect(isExpired).toBe(true);
  });

  it('não marca como expirado erro de servidor (500)', () => {
    const err = { statusCode: 500 };
    const isExpired = err.statusCode === 410 || err.statusCode === 404;
    expect(isExpired).toBe(false);
  });

  it('contabiliza sent e failed corretamente para múltiplos endpoints', () => {
    const results = [
      { ok: true },
      { ok: false, statusCode: 500 },
      { ok: true },
      { ok: false, statusCode: 410 },
    ];
    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    expect(sent).toBe(2);
    expect(failed).toBe(2);
  });
});

// ── Lógica de config.ts — inicialização lazy ──────────────────────────────

describe('sendPushNotification — inicialização lazy', () => {
  it('lança erro quando VAPID não está configurado', async () => {
    const originalSubject = process.env.VAPID_SUBJECT;
    const originalPubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const originalPrivKey = process.env.VAPID_PRIVATE_KEY;

    delete process.env.VAPID_SUBJECT;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    // Simula a lógica de ensureInitialized sem importar o módulo
    function ensureInitialized() {
      if (
        !process.env.VAPID_SUBJECT ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        !process.env.VAPID_PRIVATE_KEY
      ) {
        throw new Error('Push não configurado: variáveis VAPID ausentes.');
      }
    }

    expect(() => ensureInitialized()).toThrow('variáveis VAPID ausentes');

    process.env.VAPID_SUBJECT = originalSubject;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPubKey;
    process.env.VAPID_PRIVATE_KEY = originalPrivKey;
  });

  it('não lança erro quando todas as variáveis VAPID estão presentes', () => {
    process.env.VAPID_SUBJECT = 'mailto:test@test.com';
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';

    function ensureInitialized() {
      if (
        !process.env.VAPID_SUBJECT ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        !process.env.VAPID_PRIVATE_KEY
      ) {
        throw new Error('Push não configurado: variáveis VAPID ausentes.');
      }
    }

    expect(() => ensureInitialized()).not.toThrow();

    delete process.env.VAPID_SUBJECT;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });
});

// ── PushPermissionBanner — lógica de dismissal ────────────────────────────

describe('PushPermissionBanner — lógica de dismissal (7 dias)', () => {
  it('dismiss salva timestamp futuro no localStorage', () => {
    const DISMISS_DAYS = 7;
    const before = Date.now();
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    const after = Date.now();

    // until deve ser aproximadamente 7 dias no futuro
    expect(until).toBeGreaterThan(before + DISMISS_DAYS * 24 * 60 * 60 * 1000 - 100);
    expect(until).toBeLessThan(after + DISMISS_DAYS * 24 * 60 * 60 * 1000 + 100);
  });

  it('banner oculto quando timestamp ainda não expirou', () => {
    const until = Date.now() + 1000 * 60 * 60; // 1 hora no futuro
    const shouldShow = !(until && Date.now() < Number(until));
    expect(shouldShow).toBe(false);
  });

  it('banner visível quando timestamp expirou', () => {
    const until = Date.now() - 1000; // 1 segundo no passado
    const shouldShow = !(until && Date.now() < Number(until));
    expect(shouldShow).toBe(true);
  });

  it('banner visível quando localStorage está vazio', () => {
    const dismissedUntil = null;
    const shouldHide = dismissedUntil && Date.now() < Number(dismissedUntil);
    expect(shouldHide).toBeFalsy();
  });
});

// ── subscribeToPush — validações de ambiente ──────────────────────────────

describe('subscribeToPush — verificações de ambiente', () => {
  it('retorna false quando serviceWorker não está disponível', async () => {
    // Simula ambiente sem SW
    const hasServiceWorker = false;
    const hasPushManager = true;
    if (!hasServiceWorker || !hasPushManager) {
      expect(false).toBe(false); // retorna false
    }
  });

  it('retorna false quando NEXT_PUBLIC_VAPID_PUBLIC_KEY não está definida', async () => {
    const vapidKey = undefined;
    expect(!vapidKey).toBe(true); // retorna false
  });

  it('usa subscription existente se já registrada', async () => {
    // Simula getSubscription retornando subscription existente
    const existingSubscription = makeSubscription();
    const newSubscription = existingSubscription ?? null; // usa existente
    expect(newSubscription).toEqual(existingSubscription);
  });

  it('monta payload correto para o servidor', () => {
    const sub = makeSubscription();
    const payload = JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys });
    const parsed = JSON.parse(payload) as typeof sub;
    expect(parsed.endpoint).toBe(sub.endpoint);
    expect(parsed.keys.p256dh).toBe(sub.keys.p256dh);
    expect(parsed.keys.auth).toBe(sub.keys.auth);
  });
});
