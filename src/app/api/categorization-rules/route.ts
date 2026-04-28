import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier, PLAN_LIMITS, CATEGORIES } from '@/lib/billing/plans';

const VALID_MATCH_TYPES = ['contains', 'exact', 'starts_with'] as const;
type MatchType = (typeof VALID_MATCH_TYPES)[number];

// Explicit shape until supabase gen types is re-run after migration 022:
// supabase db push && supabase gen types typescript --local > src/lib/supabase/types.ts
type RuleRow = {
  id: string;
  user_id: string;
  pattern: string;
  match_type: MatchType;
  category: string;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// SupabaseClient without generics defaults to <any> — lets us query tables
// not yet present in the generated types file
function rulesTable(supabase: SupabaseClient) {
  return (supabase as unknown as SupabaseClient).from('categorization_rules');
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data, error } = await rulesTable(supabase)
    .select('*')
    .eq('user_id', user.id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[categorization-rules GET]', error);
    return Response.json({ error: 'Erro ao buscar regras' }, { status: 500 });
  }

  const rules = (data ?? []) as RuleRow[];
  const activeCount = rules.filter((r) => r.active).length;

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single();

  const tier = getEffectiveTier(profile?.plan ?? 'basic', profile?.trial_ends_at ?? null);
  const limit = PLAN_LIMITS[tier].maxCategorizationRules;

  return Response.json({
    data: rules,
    activeCount,
    limit,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Check plan limit
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at);
  const maxRules = PLAN_LIMITS[tier].maxCategorizationRules;

  if (maxRules !== Infinity) {
    const { count } = await rulesTable(supabase)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('active', true);

    if ((count ?? 0) >= maxRules) {
      return Response.json(
        { error: `Limite de ${maxRules} regras ativas atingido. Faça upgrade para Pro para regras ilimitadas.` },
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
  const { pattern, match_type, category, priority, active } = b;

  // Validate pattern
  if (!pattern || typeof pattern !== 'string' || pattern.trim().length < 2) {
    return Response.json({ error: 'Padrão deve ter pelo menos 2 caracteres' }, { status: 400 });
  }

  // Validate match_type
  if (match_type !== undefined && !VALID_MATCH_TYPES.includes(match_type as MatchType)) {
    return Response.json({ error: 'Tipo de match inválido. Use: contains, exact ou starts_with' }, { status: 400 });
  }

  // Validate category
  if (!category || typeof category !== 'string') {
    return Response.json({ error: 'Categoria obrigatória' }, { status: 400 });
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return Response.json({ error: 'Categoria inválida' }, { status: 400 });
  }

  // Validate priority
  if (priority !== undefined && (typeof priority !== 'number' || !Number.isInteger(priority))) {
    return Response.json({ error: 'Prioridade deve ser um número inteiro' }, { status: 400 });
  }

  const { data, error } = await rulesTable(supabase)
    .insert({
      user_id: user.id,
      pattern: pattern.trim(),
      match_type: (match_type as MatchType) ?? 'contains',
      category,
      priority: typeof priority === 'number' ? priority : 0,
      active: typeof active === 'boolean' ? active : true,
    })
    .select()
    .single();

  if (error) {
    console.error('[categorization-rules POST]', error);
    return Response.json({ error: 'Erro ao criar regra' }, { status: 500 });
  }

  return Response.json({ data: data as RuleRow }, { status: 201 });
}
