import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetVapidDetails = vi.fn();
const mockSendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

describe('lib/push/config — sendPushNotification', () => {
  const fakeSubscription = {
    endpoint: 'https://fcm.googleapis.com/push/abc',
    keys: { p256dh: 'fake-p256dh', auth: 'fake-auth' },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VAPID_SUBJECT = 'mailto:test@finansim.com.br';
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'fake-public-key';
    process.env.VAPID_PRIVATE_KEY = 'fake-private-key';
  });

  it('throws when VAPID env vars are missing', async () => {
    delete process.env.VAPID_SUBJECT;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const { sendPushNotification } = await import('@/lib/push/config');
    await expect(sendPushNotification(fakeSubscription, 'test')).rejects.toThrow(
      'Push não configurado',
    );
  });

  it('initializes VAPID details and sends notification', async () => {
    const { sendPushNotification } = await import('@/lib/push/config');
    await sendPushNotification(fakeSubscription, JSON.stringify({ title: 'Test' }));

    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      'mailto:test@finansim.com.br',
      'fake-public-key',
      'fake-private-key',
    );
    expect(mockSendNotification).toHaveBeenCalledWith(
      fakeSubscription,
      JSON.stringify({ title: 'Test' }),
    );
  });

  it('calls sendNotification with the provided payload', async () => {
    const { sendPushNotification } = await import('@/lib/push/config');
    const payload = JSON.stringify({ title: 'Alerta', body: 'Orçamento excedido' });
    await sendPushNotification(fakeSubscription, payload);
    expect(mockSendNotification).toHaveBeenCalledWith(fakeSubscription, payload);
  });
});
