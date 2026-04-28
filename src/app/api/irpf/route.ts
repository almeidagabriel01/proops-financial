import { createClient } from '@/lib/supabase/server';
import { IRPF_CATEGORIES, IRPF_FICHA, getEducationLimit } from '@/lib/irpf/category-mapping';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear - 1;

  if (isNaN(year) || year < 2000 || year > currentYear) {
    return NextResponse.json({ error: 'Ano inválido' }, { status: 400 });
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, date, description, amount, category')
    .eq('user_id', user.id)
    .in('category', [...IRPF_CATEGORIES])
    .lt('amount', 0)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = Object.fromEntries(
    IRPF_CATEGORIES.map((cat) => {
      const rows = (transactions ?? []).filter((t) => t.category === cat);
      const total = rows.reduce((s, t) => s + Math.abs(t.amount), 0);
      return [
        cat,
        {
          ficha: IRPF_FICHA[cat],
          total,
          limit: cat === 'educacao' ? getEducationLimit(year) : null,
          transactions: rows,
        },
      ];
    }),
  );

  return NextResponse.json({ year, ...grouped });
}
