// Asaas REST API client
// Docs: https://asaasv3.docs.apiary.io/
// Authentication: access_token header (server-only — never expose to client)

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  dateCreated?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  cycle: 'MONTHLY' | 'YEARLY';
  value: number;
  nextDueDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'EXPIRED' | 'CANCELED' | 'PENDING';
  invoiceUrl?: string;
  dateCreated?: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  // TODO: collect CPF/CNPJ via onboarding form before production launch (required by Asaas for real payments)
  cpfCnpj?: string;
}

export interface CreateSubscriptionInput {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  cycle: 'MONTHLY' | 'YEARLY';
  value: number;
  nextDueDate: string;
  description?: string;
}

async function asaasFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Read at call time so test env vars and runtime overrides are respected
  const base = process.env.ASAAS_BASE_URL ?? 'https://api.asaas.com/v3';
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      access_token: process.env.ASAAS_API_KEY!,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Asaas error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function createCustomer(data: CreateCustomerInput): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createSubscription(data: CreateSubscriptionInput): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}/cancel`, {
    method: 'DELETE',
  });
}

export async function getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
}

// Plan price map for checkout (monthly only — annuals are out of scope for MVP)
export const PLAN_PRICES: Record<'basic_monthly' | 'pro_monthly', { value: number; description: string }> = {
  basic_monthly: { value: 19.90, description: 'Plano Basic — R$19,90/mês' },
  pro_monthly: { value: 49.90, description: 'Plano Pro — R$49,90/mês' },
};
