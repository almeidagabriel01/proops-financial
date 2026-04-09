import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier, PLAN_LIMITS } from '@/lib/billing/plans';
import { sanitizeCategory } from '@/lib/utils/categories';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  // Período para calcular gasto real (padrão: mês atual)
  const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  const startDate = `${month}-01`;
  const endDate = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0)
    .toISOString()
    .slice(0, 10);

  // Buscar orçamentos do usuário
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .order('category');

  if (budgetsError) {
    console.error('[budgets GET]', budgetsError);
    return Response.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 });
  }

  // Calcular gastos reais por categoria no período
  const { data: transactions } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('user_id', user.id)
    .eq('type', 'debit')
    .gte('date', startDate)
    .lte('date', endDate);

  const spentByCategory: Record<string, number> = {};
  for (const tx of transactions ?? []) {
    spentByCategory[tx.category] = (spentByCategory[tx.category] ?? 0) + Math.abs(tx.amount);
  }

  const data = budgets.map((b) => ({
    ...b,
    spent: spentByCategory[b.category] ?? 0,
    remaining: b.monthly_limit - (spentByCategory[b.category] ?? 0),
    percentage: Math.min(100, Math.round(((spentByCategory[b.category] ?? 0) / b.monthly_limit) * 100)),
  }));

  return Response.json({ data, month });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Verificar limite de orçamentos por plano
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at);
  const maxBudgets = PLAN_LIMITS[tier].maxBudgetCategories;

  if (maxBudgets !== Infinity) {
    const { count } = await supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) >= maxBudgets) {
      return Response.json(
        { error: `Limite de ${maxBudgets} orçamentos atingido. Faça upgrade para Pro para orçamentos ilimitados.` },
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
  const { category, monthly_limit } = b;

  if (!category || typeof category !== 'string') {
    return Response.json({ error: 'Categoria obrigatória' }, { status: 400 });
  }
  if (!monthly_limit || typeof monthly_limit !== 'number' || monthly_limit <= 0) {
    return Response.json({ error: 'Limite mensal inválido' }, { status: 400 });
  }

  const sanitized = sanitizeCategory(category);

  // Upsert por (user_id, category)
  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { user_id: user.id, category: sanitized, monthly_limit: monthly_limit as number },
      { onConflict: 'user_id,category' }
    )
    .select()
    .single();

  if (error) {
    console.error('[budgets POST]', error);
    return Response.json({ error: 'Erro ao salvar orçamento' }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}
