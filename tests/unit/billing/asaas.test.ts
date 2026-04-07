import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCustomer, createSubscription, cancelSubscription, getSubscription, PLAN_PRICES } from '@/lib/billing/asaas';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockClear();
  vi.stubGlobal('fetch', mockFetch);
  // Set env vars for tests — ASAAS_BASE_URL read at call time in asaasFetch
  vi.stubEnv('ASAAS_API_KEY', 'test-api-key');
  vi.stubEnv('ASAAS_BASE_URL', 'https://sandbox.asaas.com/v3');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

describe('PLAN_PRICES', () => {
  it('has basic_monthly at R$19.90', () => {
    expect(PLAN_PRICES.basic_monthly.value).toBe(19.90);
  });

  it('has pro_monthly at R$49.90', () => {
    expect(PLAN_PRICES.pro_monthly.value).toBe(49.90);
  });
});

describe('createCustomer', () => {
  it('calls POST /customers with correct headers', async () => {
    const customer = { id: 'cus_123', name: 'João', email: 'joao@test.com', cpfCnpj: '12345678901' };
    mockFetch.mockResolvedValueOnce(mockResponse(customer));

    const result = await createCustomer({ name: 'João', email: 'joao@test.com', cpfCnpj: '12345678901' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://sandbox.asaas.com/v3/customers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ access_token: 'test-api-key' }),
      })
    );
    expect(result.id).toBe('cus_123');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Invalid CPF' }, false, 400));

    await expect(createCustomer({ name: 'João', email: 'x@x.com', cpfCnpj: 'bad' }))
      .rejects
      .toThrow('Asaas error 400');
  });
});

describe('createSubscription', () => {
  it('calls POST /subscriptions and returns subscription', async () => {
    const sub = { id: 'sub_abc', customer: 'cus_123', cycle: 'MONTHLY', value: 49.90, status: 'ACTIVE', nextDueDate: '2026-05-07', billingType: 'UNDEFINED' };
    mockFetch.mockResolvedValueOnce(mockResponse(sub));

    const result = await createSubscription({
      customer: 'cus_123',
      billingType: 'UNDEFINED',
      cycle: 'MONTHLY',
      value: 49.90,
      nextDueDate: '2026-05-07',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://sandbox.asaas.com/v3/subscriptions',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.id).toBe('sub_abc');
  });
});

describe('cancelSubscription', () => {
  it('calls DELETE /subscriptions/:id/cancel', async () => {
    const sub = { id: 'sub_abc', status: 'CANCELED', customer: 'cus_123', cycle: 'MONTHLY', value: 49.90, nextDueDate: '2026-05-07', billingType: 'UNDEFINED' };
    mockFetch.mockResolvedValueOnce(mockResponse(sub));

    const result = await cancelSubscription('sub_abc');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://sandbox.asaas.com/v3/subscriptions/sub_abc/cancel',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(result.status).toBe('CANCELED');
  });
});

describe('getSubscription', () => {
  it('calls GET /subscriptions/:id', async () => {
    const sub = { id: 'sub_abc', status: 'ACTIVE', customer: 'cus_123', cycle: 'MONTHLY', value: 49.90, nextDueDate: '2026-05-07', billingType: 'UNDEFINED' };
    mockFetch.mockResolvedValueOnce(mockResponse(sub));

    const result = await getSubscription('sub_abc');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://sandbox.asaas.com/v3/subscriptions/sub_abc',
      expect.objectContaining({ headers: expect.objectContaining({ access_token: 'test-api-key' }) })
    );
    expect(result.id).toBe('sub_abc');
  });
});
