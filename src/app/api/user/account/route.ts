import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const userId = user.id;
  const supabaseAdmin = await createServiceClient();

  try {
    // 1. Financial data — order respects foreign key dependencies
    await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
    await supabaseAdmin.from('budgets').delete().eq('user_id', userId);
    await supabaseAdmin.from('goals').delete().eq('user_id', userId);
    await supabaseAdmin.from('category_dictionary').delete().eq('user_id', userId);
    await supabaseAdmin.from('chat_messages').delete().eq('user_id', userId);
    await supabaseAdmin.from('bank_accounts').delete().eq('user_id', userId);
    await supabaseAdmin.from('imports').delete().eq('user_id', userId);

    // 2. Cancel Stripe subscription if active
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .in('status', ['active', 'past_due'])
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      } catch {
        // Ignore — subscription may already be cancelled or not found
      }
    }
    await supabaseAdmin.from('subscriptions').delete().eq('user_id', userId);

    // 3. Profile and auth — profile has ON DELETE CASCADE from auth.users,
    //    but we delete explicitly for clarity and to ensure analytics cleanup
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[DELETE /api/user/account] Error:', err);
    return NextResponse.json({ error: 'Erro interno ao excluir conta' }, { status: 500 });
  }
}
