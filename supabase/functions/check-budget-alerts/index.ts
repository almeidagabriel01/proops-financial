// DENO RUNTIME — not Node.js!
// Verifica orçamentos de todos os usuários e envia push notifications
// nos thresholds de 80% e 100% do gasto mensal.
//
// Invocado por:
//   - /api/cron/check-budgets (Vercel Cron Job — diário às 08h UTC)
//   - /api/import (fire-and-forget após categorização de extrato)
//
// TOCTOU fix: insert no budget_alert_log ANTES de enviar o push.
// Se a insert falhar com 23505 (unique violation) → já enviado este mês, skip.
// Se a insert suceder → somos os "donos" desta notificação, enviar.
// Isso garante que duas invocações simultâneas nunca enviem o mesmo alerta duas vezes.

import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
}

interface SupabaseError {
  code?: string;
  message?: string;
}

// ─── Labels PT-BR das 14 categorias ─────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  alimentacao:   'Alimentação',
  delivery:      'Delivery',
  transporte:    'Transporte',
  moradia:       'Moradia',
  saude:         'Saúde',
  educacao:      'Educação',
  lazer:         'Lazer',
  compras:       'Compras',
  assinaturas:   'Assinaturas',
  transferencias:'Transferências',
  salario:       'Salário',
  investimentos: 'Investimentos',
  impostos:      'Impostos',
  outros:        'Outros',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const appUrl       = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // 1. Buscar todos os orçamentos
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('id, user_id, category, monthly_limit');

  if (budgetsError) {
    console.error('[check-budget-alerts] fetch budgets error:', budgetsError);
    return new Response(
      JSON.stringify({ error: 'fetch budgets failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let processed = 0;
  let alertsSent = 0;

  for (const budget of (budgets ?? []) as Budget[]) {
    processed++;

    // 2. Calcular gasto real do mês via RPC (usa índice B-tree na coluna date)
    const { data: spent, error: spentError } = await supabase.rpc('get_category_spending', {
      p_user_id:  budget.user_id,
      p_category: budget.category,
      p_month:    currentMonth,
    });

    if (spentError) {
      console.error('[check-budget-alerts] rpc error for budget', budget.id, spentError);
      continue;
    }

    const spentValue = (spent as number) ?? 0;
    const pct = budget.monthly_limit > 0
      ? (spentValue / budget.monthly_limit) * 100
      : 0;

    // 3. Verificar thresholds 80% e 100%
    for (const threshold of [80, 100] as const) {
      if (pct < threshold) continue;

      // TOCTOU fix: tentar insert primeiro.
      // Sucesso → somos os responsáveis por enviar este alerta.
      // Erro 23505 (unique violation) → já enviado este mês, pular.
      const { error: logError } = await supabase
        .from('budget_alert_log')
        .insert({
          user_id:   budget.user_id,
          budget_id: budget.id,
          threshold,
          month:     currentMonth,
        });

      if (logError) {
        const supaError = logError as SupabaseError;
        if (supaError.code === '23505') {
          // Alerta já enviado neste mês — skip silencioso
          continue;
        }
        console.error('[check-budget-alerts] log insert error for budget', budget.id, logError);
        continue;
      }

      // Verificar se usuário tem subscription ativa.
      // AC6: log já inserido mesmo sem subscription — evita re-envio retroativo
      // quando usuário ativar push no futuro.
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', budget.user_id)
        .limit(1);

      if (!subs?.length) continue;

      // Enviar push via /api/push/send
      const label = categoryLabel(budget.category);
      const body = threshold === 80
        ? `Você usou 80% do orçamento de ${label} este mês (R$ ${formatBRL(spentValue)} de R$ ${formatBRL(budget.monthly_limit)})`
        : `Orçamento de ${label} estourado! (R$ ${formatBRL(spentValue)} gastos, limite R$ ${formatBRL(budget.monthly_limit)})`;

      try {
        const pushRes = await fetch(`${appUrl}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: budget.user_id,
            title:   threshold === 80 ? 'Orçamento em 80%' : 'Orçamento estourado!',
            body,
            url:     '/more/orcamentos',
          }),
        });

        if (!pushRes.ok) {
          console.error(
            '[check-budget-alerts] push/send returned',
            pushRes.status,
            'for budget', budget.id,
          );
        } else {
          alertsSent++;
        }
      } catch (err) {
        // Falha de rede — logar e continuar para próximo orçamento
        console.error('[check-budget-alerts] push send error for budget', budget.id, err);
      }
    }
  }

  console.log(
    `[check-budget-alerts] done — processed: ${processed}, alerts sent: ${alertsSent}`,
  );

  return new Response(
    JSON.stringify({ ok: true, processed, alertsSent }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
