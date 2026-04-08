# Analytics — Consulta de Métricas no Supabase Studio

Guia para consultar manualmente as métricas de uso do Finansim via Supabase Studio ou API.
Todos os dados ficam na tabela `analytics_events` (write-only para usuários; leitura via service role).

---

## Acessar

1. Abra o Supabase Studio → SQL Editor
2. Use as queries abaixo (requerem service role key — não funcionam com anon key via RLS)

---

## Eventos disponíveis

| event_name | Quando ocorre | Propriedades |
|------------|--------------|-------------|
| `import_completed` | Extrato importado com sucesso | `file_format`, `transaction_count`, `duration_ms` |
| `chat_message_sent` | Mensagem enviada ao assistente | `plan`, `model`, `query_count_after` |
| `trial_started` | Trial Pro iniciado (novo usuário) | `plan: 'pro'` |
| `subscription_created` | Assinatura Pro criada | `plan`, `billing_cycle` |
| `onboarding_completed` | Onboarding concluído | `skipped: boolean` |

---

## Queries de métricas

### DAU — Usuários ativos únicos hoje

```sql
SELECT COUNT(DISTINCT user_id) AS dau
FROM analytics_events
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
```

### MAU — Usuários ativos únicos nos últimos 30 dias

```sql
SELECT COUNT(DISTINCT user_id) AS mau
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Importações por dia (últimos 7 dias)

```sql
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS imports,
  SUM((properties->>'transaction_count')::int) AS total_transactions
FROM analytics_events
WHERE event_name = 'import_completed'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

### Conversão: trial → subscription

```sql
WITH trials AS (
  SELECT COUNT(DISTINCT user_id) AS total_trials
  FROM analytics_events
  WHERE event_name = 'trial_started'
),
conversions AS (
  SELECT COUNT(DISTINCT user_id) AS total_conversions
  FROM analytics_events
  WHERE event_name = 'subscription_created'
)
SELECT
  total_trials,
  total_conversions,
  ROUND(100.0 * total_conversions / NULLIF(total_trials, 0), 1) AS conversion_pct
FROM trials, conversions;
```

### Onboarding — taxa de conclusão vs. skip

```sql
SELECT
  properties->>'skipped' AS skipped,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM analytics_events
WHERE event_name = 'onboarding_completed'
GROUP BY properties->>'skipped';
```

### Volume de mensagens de chat por plano

```sql
SELECT
  properties->>'plan' AS plan,
  COUNT(*) AS messages,
  DATE(created_at) AS day
FROM analytics_events
WHERE event_name = 'chat_message_sent'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY properties->>'plan', DATE(created_at)
ORDER BY day DESC, plan;
```

---

## View utilitária (opcional)

Para facilitar consultas recorrentes, crie a view no Supabase:

```sql
-- analytics_summary: resumo de métricas dos últimos 30 dias
-- Acessível apenas com service role (sem RLS nesta view)
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE THEN user_id END) AS dau_today,
  COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN user_id END) AS mau_30d,
  COUNT(CASE WHEN event_name = 'import_completed' AND created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS imports_7d,
  COUNT(CASE WHEN event_name = 'subscription_created' THEN 1 END) AS total_subscriptions,
  COUNT(CASE WHEN event_name = 'trial_started' THEN 1 END) AS total_trials
FROM analytics_events;
```

Consultar: `SELECT * FROM analytics_summary;`

---

## Notas

- A tabela usa `ON DELETE CASCADE` em `user_id` — eventos são removidos quando a conta é excluída (LGPD)
- Sem PII nos eventos — apenas `user_id` (UUID), sem e-mail, nome ou dados financeiros
- Timezone: todos os timestamps em UTC (`timestamptz`)
