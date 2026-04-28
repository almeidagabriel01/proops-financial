-- Migration: budget_alert_log
-- Rastreia alertas de orçamento já enviados por mês para evitar spam.
-- A Edge Function check-budget-alerts usa service role — não precisa de
-- políticas INSERT/DELETE via RLS. SELECT exposto para o usuário visualizar
-- histórico de alertas futuramente.

CREATE TABLE public.budget_alert_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id   uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  threshold   int  NOT NULL CHECK (threshold IN (80, 100)),
  month       text NOT NULL,  -- formato YYYY-MM
  sent_at     timestamptz DEFAULT now(),
  CONSTRAINT budget_alert_log_unique UNIQUE(budget_id, threshold, month)
);

-- Índice para queries por usuário + mês (listagem de histórico)
CREATE INDEX budget_alert_log_user_month_idx
  ON public.budget_alert_log(user_id, month);

ALTER TABLE public.budget_alert_log ENABLE ROW LEVEL SECURITY;

-- Usuário pode ler seus próprios logs (histórico de alertas).
-- INSERT/DELETE feitos pela Edge Function via service role — sem política RLS necessária.
CREATE POLICY "budget_alert_log_select_own"
  ON public.budget_alert_log
  FOR SELECT
  USING (user_id = auth.uid());

-- ── Função auxiliar para gasto por categoria ────────────────────────────────
-- Usada pela Edge Function check-budget-alerts.
-- Usa range de datas (>= / <) em vez de to_char() para permitir uso de índice
-- B-tree na coluna date, evitando seq scan em tabelas grandes.

CREATE OR REPLACE FUNCTION public.get_category_spending(
  p_user_id uuid,
  p_category text,
  p_month    text   -- formato YYYY-MM
) RETURNS numeric AS $$
  SELECT COALESCE(SUM(ABS(amount)), 0)
  FROM public.transactions
  WHERE user_id  = p_user_id
    AND category = p_category
    AND type     = 'debit'
    AND date >= (p_month || '-01')::date
    AND date <  ((p_month || '-01')::date + interval '1 month')::date;
$$ LANGUAGE sql SECURITY DEFINER;
