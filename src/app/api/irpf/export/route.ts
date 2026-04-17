import { createClient } from '@/lib/supabase/server';
import { IRPF_CATEGORIES } from '@/lib/irpf/category-mapping';
import { generateIrpfCsv, type IrpfTransaction } from '@/lib/irpf/export-csv';
import { generateIrpfPdf } from '@/lib/irpf/export-pdf';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const format = searchParams.get('format');

  if (format !== 'csv' && format !== 'pdf') {
    return NextResponse.json({ error: 'format deve ser csv ou pdf' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear - 1;

  if (isNaN(year) || year < 2000 || year > currentYear) {
    return NextResponse.json({ error: 'Ano inválido' }, { status: 400 });
  }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('date, description, amount, category')
    .eq('user_id', user.id)
    .in('category', [...IRPF_CATEGORIES])
    .lt('amount', 0)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (transactions ?? []) as IrpfTransaction[];

  if (format === 'csv') {
    const csvBuffer = generateIrpfCsv(rows, year);
    return new Response(new Uint8Array(csvBuffer), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="irpf-${year}-finansim.csv"`,
      },
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const userName = profile?.display_name ?? user.email?.split('@')[0] ?? 'usuário';

  const saude = rows.filter((t) => t.category === 'saude');
  const educacao = rows.filter((t) => t.category === 'educacao');

  const pdfBuffer = await generateIrpfPdf({ year, userName, saude, educacao });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="irpf-${year}-finansim.pdf"`,
    },
  });
}
