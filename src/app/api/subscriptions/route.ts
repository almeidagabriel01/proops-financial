import { type NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function subsTable(supabase: SupabaseClient) {
  return supabase.from('detected_subscriptions');
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const includeDismissed = req.nextUrl.searchParams.get('include_dismissed') === 'true';

  let query = subsTable(supabase)
    .select(
      'id, display_name, description_normalized, current_amount, previous_amount, frequency, last_occurrence_date, occurrence_count, price_change_detected, dismissed_at',
    )
    .eq('user_id', user.id)
    .order('price_change_detected', { ascending: false })
    .order('current_amount', { ascending: false });

  if (!includeDismissed) {
    query = query.is('dismissed_at', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[subscriptions GET] query error:', error);
    return NextResponse.json({ error: 'Erro ao buscar assinaturas' }, { status: 500 });
  }

  const subscriptions = (data ?? []) as {
    id: string;
    display_name: string;
    description_normalized: string;
    current_amount: number;
    previous_amount: number | null;
    frequency: 'monthly' | 'annual';
    last_occurrence_date: string;
    occurrence_count: number;
    price_change_detected: boolean;
    dismissed_at: string | null;
  }[];

  // Total monthly spend: monthly subs as-is, annual / 12
  const total_monthly = subscriptions.reduce((sum, s) => {
    return sum + (s.frequency === 'monthly' ? s.current_amount : s.current_amount / 12);
  }, 0);

  const total_annual_equivalent = total_monthly * 12;

  return NextResponse.json({ subscriptions, total_monthly, total_annual_equivalent });
}
