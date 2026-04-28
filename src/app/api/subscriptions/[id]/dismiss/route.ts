import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function subsTable(supabase: SupabaseClient) {
  return supabase.from('detected_subscriptions');
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  const { error } = await subsTable(supabase)
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[subscriptions/dismiss] update error:', error);
    return NextResponse.json({ error: 'Erro ao descartar assinatura' }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
