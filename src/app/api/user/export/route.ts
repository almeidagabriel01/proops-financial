import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabaseAdmin = await createServiceClient();

  const [
    { data: profile },
    { data: transactions },
    { data: budgets },
    { data: goals },
    { data: categoryDictionary },
    { data: chatMessages },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('display_name, plan, trial_ends_at, created_at')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('transactions')
      .select('date, description, amount, category, type, bank_account_id, created_at')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
    supabaseAdmin
      .from('budgets')
      .select('category, amount_limit, period_month, created_at')
      .eq('user_id', user.id),
    supabaseAdmin
      .from('goals')
      .select('name, target_amount, current_amount, deadline, created_at')
      .eq('user_id', user.id),
    supabaseAdmin
      .from('category_dictionary')
      .select('description_pattern, category, created_at')
      .eq('user_id', user.id),
    supabaseAdmin
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: {
      email: user.email,
      display_name: profile?.display_name,
      plan: profile?.plan,
      trial_ends_at: profile?.trial_ends_at,
      created_at: profile?.created_at,
    },
    transactions: transactions ?? [],
    budgets: budgets ?? [],
    goals: goals ?? [],
    category_dictionary: categoryDictionary ?? [],
    chat_messages: chatMessages ?? [],
  };

  const date = new Date().toISOString().split('T')[0];
  const filename = `meus-dados-finansim-${date}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
