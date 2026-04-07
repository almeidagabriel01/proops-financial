import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createCustomer, createSubscription, PLAN_PRICES } from '@/lib/billing/asaas';

type PlanKey = 'basic_monthly' | 'pro_monthly';

function nextMonthDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { planKey }: { planKey: PlanKey } = await req.json();
  if (!planKey || !PLAN_PRICES[planKey]) {
    return NextResponse.json({ error: 'Invalid planKey' }, { status: 400 });
  }

  const plan = PLAN_PRICES[planKey];

  // Load profile (for name, email, cpfCnpj, existing asaas_customer_id)
  const serviceSupabase = await createServiceClient();
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('display_name, asaas_customer_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
  }

  // Ensure Asaas customer exists
  let asaasCustomerId = profile.asaas_customer_id as string | null;
  if (!asaasCustomerId) {
    const customer = await createCustomer({
      name: profile.display_name ?? user.email ?? 'Usuário',
      email: user.email!,
      cpfCnpj: '00000000000', // CPF placeholder — Asaas requires it; real flow collects via form
    });
    asaasCustomerId = customer.id;
    await serviceSupabase
      .from('profiles')
      .update({ asaas_customer_id: asaasCustomerId })
      .eq('id', user.id);
  }

  // Create subscription in Asaas
  const subscription = await createSubscription({
    customer: asaasCustomerId,
    billingType: 'UNDEFINED', // Let user choose payment method on Asaas checkout page
    cycle: 'MONTHLY',
    value: plan.value,
    nextDueDate: nextMonthDate(),
    description: plan.description,
  });

  // Save pending subscription immediately — webhook needs this to map event → user_id
  await serviceSupabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      asaas_subscription_id: subscription.id,
      billing_cycle: 'monthly',
      status: 'pending',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'asaas_subscription_id' }
  );

  return NextResponse.json({ checkoutUrl: subscription.invoiceUrl ?? '' });
}
