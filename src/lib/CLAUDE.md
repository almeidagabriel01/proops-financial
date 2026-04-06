# src/lib/ — Core Business Logic

Toda a lógica de negócio reutilizável fica aqui. Nenhuma lógica de negócio em components ou pages — eles são camada de apresentação.

---

## Módulos

```
lib/
├── supabase/           # Clientes Supabase + tipos gerados
├── parsers/            # Parsing de OFX e CSV bancários
├── ai/                 # Integração Claude API (categorização + chat)
├── billing/            # Integração Asaas + gerenciamento de planos
└── utils/              # Utilitários gerais (formatação, constantes)
```

---

## supabase/

### Dois clientes distintos — usar o correto
```typescript
// client.ts — Browser (usa cookies, funciona com RLS, seguro expor)
import { createBrowserClient } from '@supabase/ssr'
// Usar em Client Components e hooks

// server.ts — Server (API Routes, Server Components, middleware)
import { createServerClient } from '@supabase/ssr'
// Usar no servidor — nunca expor service_role no browser
```

### Tipos (`types.ts`)
Gerados automaticamente via Supabase CLI — **não editar manualmente**:
```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

---

## parsers/

### OFX Parser (`ofx-parser.ts`)
- Extrai: data, valor, descrição, tipo (débito/crédito), `FITID` (ID nativo do banco)
- `FITID` é o `external_id` — usado para deduplicação em OFX

### CSV Parser (`csv-parser.ts`)
- Detecta delimitador automaticamente (`,` ou `;`)
- Detecta formato do banco via `bank-formats/`
- Gera `external_id` sintético: `SHA-256(date + amount + normalized_description)`

### Formatos suportados (`bank-formats/`)
- `nubank.ts` — formato Nubank CSV
- `itau.ts` — formato Itaú CSV
- `bradesco.ts` — formato Bradesco CSV
- `index.ts` — detector automático de banco

### Interface de saída (`types.ts`)
```typescript
interface ParsedTransaction {
  external_id: string   // OFX: FITID; CSV: SHA-256 hash
  date: string          // ISO 8601 (YYYY-MM-DD)
  description: string   // Descrição bruta do banco
  amount: number        // Positivo = crédito, negativo = débito
  type: 'credit' | 'debit'
}
```

---

## ai/

### Hierarquia de categorização (ordem de prioridade)
```
1. Dicionário do usuário (category_dictionary)  ← mais alta prioridade
2. Cache global (category_cache)
3. Claude Haiku 4.5 via API                     ← último recurso
```

### categorizer.ts — Batch categorization
- Sempre processar em batch (array de transações de uma vez)
- Nunca categorizar transação por transação (custo proibitivo)
- Fallback para `'outros'` quando confiança < threshold
- Salvar resultado no `category_cache` para reutilização cross-user

### chat.ts — Conversational AI
- Modelo: Claude Sonnet 4.6 com streaming
- Contexto: transações categorizadas do usuário (últimos N meses)
- Responde APENAS com base nos dados reais — nunca inventar números
- Rate limit: 20 msgs/dia verificado server-side ANTES de chamar a API

### prompts/
- `categorize.ts` — prompt otimizado para 14 categorias + contexto BR
- `chat-system.ts` — system prompt do assistente financeiro PT-BR

### cache.ts
- Consulta `category_cache` antes de chamar Haiku
- Chave: `description_normalized` (lowercase, trim, whitespace-collapse)

---

## billing/

### asaas.ts
- Cliente HTTP para Asaas API
- Criar/cancelar assinaturas, consultar status

### plans.ts
- Definições de planos (Free / Premium)
- Limites por plano (contas, histórico, rate limit IA)
- Helper `isPremium(profile)` — verifica plan + trial_ends_at

### webhook-handler.ts
- Processar eventos: `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_CANCELED`
- Atualizar `subscriptions` table → trigger sincroniza `profiles.plan`
- Período de graça de 3 dias para `PAYMENT_OVERDUE`

---

## utils/

### constants.ts
```typescript
export const CATEGORIES = ['alimentacao', 'delivery', 'transporte', 'moradia',
  'saude', 'educacao', 'lazer', 'compras', 'assinaturas', 'transferencias',
  'salario', 'investimentos', 'impostos', 'outros'] as const

export const MAX_FILE_SIZE_MB = 5
export const AI_QUERIES_PER_DAY = 20
export const TRIAL_DAYS = 7
```

### format.ts
- `formatCurrency(amount)` — R$ 1.234,56 (locale pt-BR)
- `formatDate(date)` — DD/MM/YYYY
- `normalizeDescription(text)` — lowercase + trim + whitespace-collapse (para cache)

### rate-limit.ts
- `checkAndIncrementAIQuota(userId)` — verifica + incrementa `ai_queries_today`
- Reset automático via `ai_queries_reset_at` (comparar com data atual)

---

## Regras

- **Imports absolutos:** `import { ... } from '@/lib/supabase/server'`
- **Sem lógica de negócio em pages/components** — tudo vai em `lib/`
- **Service role key** apenas em `lib/supabase/server.ts` — nunca no client
- **Testar tudo em `tests/unit/`** — especialmente parsers e lógica de billing
