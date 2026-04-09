import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier, PLAN_LIMITS } from '@/lib/billing/plans';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('[goals GET]', error);
    return Response.json({ error: 'Erro ao buscar objetivos' }, { status: 500 });
  }

  return Response.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Verificar limite de objetivos por plano
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at);
  const maxGoals = PLAN_LIMITS[tier].maxGoals;

  if (maxGoals !== Infinity) {
    const { count } = await supabase
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if ((count ?? 0) >= maxGoals) {
      return Response.json(
        { error: `Limite de ${maxGoals} objetivos ativos atingido. Faça upgrade para Pro para objetivos ilimitados.` },
        { status: 403 }
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const { name, target_amount, deadline, current_amount } = b;

  if (!name || typeof name !== 'string' || (name as string).trim().length === 0) {
    return Response.json({ error: 'Nome do objetivo obrigatório' }, { status: 400 });
  }
  if (!target_amount || typeof target_amount !== 'number' || target_amount <= 0) {
    return Response.json({ error: 'Valor alvo inválido' }, { status: 400 });
  }
  if (!deadline || typeof deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadline as string)) {
    return Response.json({ error: 'Prazo inválido (YYYY-MM-DD)' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      name: (name as string).trim().slice(0, 100),
      target_amount: target_amount as number,
      current_amount: typeof current_amount === 'number' && current_amount >= 0 ? current_amount : 0,
      deadline: deadline as string,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('[goals POST]', error);
    return Response.json({ error: 'Erro ao criar objetivo' }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}
