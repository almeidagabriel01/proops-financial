import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prefix = (new URL(request.url).searchParams.get('q') ?? '').trim().toLowerCase();

  // Fetch all tags for this user to compute frequency counts in JS.
  // Acceptable for MVP — users typically have few unique tags.
  const { data, error: fetchError } = await supabase
    .from('transaction_tags')
    .select('tag')
    .eq('user_id', user.id);

  if (fetchError) {
    console.error('[tags/autocomplete] fetch error:', fetchError);
    return Response.json({ error: 'Erro ao buscar tags' }, { status: 500 });
  }

  const rows = data ?? [];

  // Count frequency per tag
  const freq = new Map<string, number>();
  for (const { tag } of rows) {
    freq.set(tag, (freq.get(tag) ?? 0) + 1);
  }

  // Filter by prefix, then sort by frequency desc, limit to 20
  const suggestions = [...freq.entries()]
    .filter(([tag]) => tag.startsWith(prefix))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);

  return Response.json({ suggestions });
}
