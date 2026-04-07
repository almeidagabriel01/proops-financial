import type { SupabaseClient } from '@supabase/supabase-js';

// Asaas webhook event types relevant to billing
export type AsaasEventType =
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'SUBSCRIPTION_CANCELED';

export interface AsaasWebhookEvent {
  event: AsaasEventType | string;
  payment?: {
    id: string;
    subscription?: string; // asaas_subscription_id
    customer: string;      // asaas_customer_id
    status: string;
  };
  subscription?: {
    id: string;
    customer: string;
    status: string;
  };
}

// Grace period: 3 days after PAYMENT_OVERDUE before revoking access
const GRACE_PERIOD_DAYS = 3;

export function isWithinGracePeriod(updatedAt: string): boolean {
  const updatedMs = new Date(updatedAt).getTime();
  const nowMs = Date.now();
  return nowMs - updatedMs < GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
}

export async function handleAsaasWebhook(
  event: AsaasWebhookEvent,
  supabase: SupabaseClient
): Promise<void> {
  // Resolve asaas_subscription_id from the event
  const asaasSubscriptionId =
    event.subscription?.id ?? event.payment?.subscription ?? null;

  if (!asaasSubscriptionId) {
    // Event has no subscription reference — ignore (e.g. one-off payment)
    return;
  }

  switch (event.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('asaas_subscription_id', asaasSubscriptionId);
      // Trigger sync_plan_from_subscription fires automatically on update → sets profiles.plan='pro'
      break;
    }

    case 'PAYMENT_OVERDUE': {
      // Mark as past_due — grace period logic applied in API routes
      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('asaas_subscription_id', asaasSubscriptionId);
      // Trigger does NOT revoke on past_due — grace period maintained
      break;
    }

    case 'SUBSCRIPTION_CANCELED':
    case 'PAYMENT_DELETED': {
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('asaas_subscription_id', asaasSubscriptionId);
      // Trigger sync_plan_from_subscription fires → sets profiles.plan='basic', audio_enabled=false
      break;
    }

    default:
      // Unknown event — ignore; return 200 so Asaas doesn't retry
      break;
  }
}
