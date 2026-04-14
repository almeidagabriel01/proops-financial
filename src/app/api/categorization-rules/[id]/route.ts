import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/billing/plans';

const VALID_MATCH_TYPES = ['contains', 'exact', 'starts_with'] as const;
type MatchType = (typeof VALID_MATCH_TYPES)[number];

function rulesTable(supabase: SupabaseClient) {
  return (supabase as unknown as SupabaseClient).from('categorization_rules');
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Verify ownership before update
  const { data: existing, error: fetchError } = await rulesTable(supabase)
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existing) {
    return Response.json({ error: 'Regra não encontrada' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if ('pattern' in b) {
    if (typeof b.pattern !== 'string' || b.pattern.trim().length < 2) {
      return Response.json({ error: 'Padrão deve ter pelo menos 2 caracteres' }, { status: 400 });
    }
    updates.pattern = b.pattern.trim();
  }

  if ('match_type' in b) {
    if (!VALID_MATCH_TYPES.includes(b.match_type as MatchType)) {
      return Response.json({ error: 'Tipo de match inválido. Use: contains, exact ou starts_with' }, { status: 400 });
    }
    updates.match_type = b.match_type;
  }

  if ('category' in b) {
    if (typeof b.category !== 'string' || !CATEGORIES.includes(b.category as (typeof CATEGORIES)[number])) {
      return Response.json({ error: 'Categoria inválida' }, { status: 400 });
    }
    updates.category = b.category;
  }

  if ('priority' in b) {
    if (typeof b.priority !== 'number' || !Number.isInteger(b.priority)) {
      return Response.json({ error: 'Prioridade deve ser um número inteiro' }, { status: 400 });
    }
    updates.priority = b.priority;
  }

  if ('active' in b) {
    if (typeof b.active !== 'boolean') {
      return Response.json({ error: 'active deve ser boolean' }, { status: 400 });
    }
    updates.active = b.active;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
  }

  const { data, error } = await rulesTable(supabase)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[categorization-rules PATCH]', error);
    return Response.json({ error: 'Erro ao atualizar regra' }, { status: 500 });
  }

  return Response.json({ data });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { error } = await rulesTable(supabase)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[categorization-rules DELETE]', error);
    return Response.json({ error: 'Erro ao excluir regra' }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
