import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { monthly_report_email } = body as { monthly_report_email?: boolean };

  if (typeof monthly_report_email !== 'boolean') {
    return Response.json({ error: 'Campo monthly_report_email deve ser boolean' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ monthly_report_email })
    .eq('id', user.id);

  if (error) {
    console.error('[user/preferences PATCH]', error);
    return Response.json({ error: 'Erro ao salvar preferência' }, { status: 500 });
  }

  return Response.json({ success: true });
}
