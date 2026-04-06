---
name: debugging-strategies
description: "Estratégias de debugging para o App Financeiro Pessoal com IA. Use quando: investigando bugs em parsers OFX/CSV, erros de categorização IA, problemas de RLS/autenticação Supabase, falhas de webhook Asaas, erros de streaming de chat, ou problemas de performance. Inclui checklist por área e comandos de diagnóstico."
metadata:
  author: project
  version: "1.0.0"
---

# Debugging Strategies — App Financeiro Pessoal

## Método Geral

1. **Reproduzir** — reproduzir o bug de forma confiável antes de tentar corrigir
2. **Isolar** — identificar a menor unidade de código que reproduz o problema
3. **Hipótese** — formular hipótese sobre a causa, verificar com dados
4. **Corrigir** — fazer a mudança mínima que resolve
5. **Verificar** — confirmar que o bug sumiu E que nada quebrou

---

## Debugging por Área

### Parsers OFX/CSV

**Sintomas comuns:**
- `external_id` duplicado / transações sendo ignoradas incorretamente
- Valores com sinal errado (crédito como débito)
- Datas em fuso horário incorreto
- Encoding de caracteres (acentos corrompidos)

**Abordagem:**
```typescript
// Adicionar log temporário para ver o arquivo bruto
const text = await file.text()
console.log('[debug] Primeiros 500 chars:', text.substring(0, 500))
console.log('[debug] Encoding:', detectEncoding(text))

// Testar com fixture real
import { parseOFX } from '@/lib/parsers/ofx-parser'
const result = await parseOFX(fs.readFileSync('tests/fixtures/itau-sample.ofx', 'utf-8'))
console.log('[debug] Parsed transactions:', JSON.stringify(result.slice(0, 3), null, 2))
```

**Checklist:**
- [ ] O arquivo está sendo lido com encoding correto? (UTF-8 vs latin1)
- [ ] O SHA-256 está sendo calculado com a descrição normalizada? (lowercase, trim, whitespace-collapse)
- [ ] A data está sendo parseada como UTC ou local? (usar `date-fns/parseISO`)
- [ ] O `external_id` no banco tem a constraint `unique(user_id, bank_account_id, external_id)`?

---

### Categorização IA

**Sintomas comuns:**
- Todas as transações ficando como "outros"
- Cache não sendo usado (chamadas desnecessárias à API)
- Erro de timeout (batch muito grande)
- Resposta da IA não parseable como JSON

**Abordagem:**
```typescript
// Verificar se cache está sendo consultado
const normalized = normalizeDescription(description)
const { data: cached } = await supabase
  .from('category_cache')
  .select('category')
  .eq('description_normalized', normalized)
  .single()
console.log('[debug] Cache hit:', cached?.category)

// Verificar resposta bruta da IA
const response = await anthropic.messages.create({ ... })
console.log('[debug] Raw AI response:', response.content[0].text)

// Testar se JSON é parseable
try {
  const parsed = JSON.parse(response.content[0].text)
  console.log('[debug] Parsed categories:', parsed)
} catch (e) {
  console.error('[debug] JSON parse error:', e)
}
```

**Checklist:**
- [ ] O prompt solicita resposta em JSON válido?
- [ ] O batch tem <= 100 transações? (contexto muito grande causa erros)
- [ ] A normalização de descrição é idêntica em ambos: ao salvar no cache e ao consultar?
- [ ] O modelo Haiku está sendo usado (não Sonnet) para categorização?

---

### Autenticação / RLS Supabase

**Sintomas comuns:**
- `{}` vazio em queries que deveriam retornar dados
- Erro "new row violates row-level security policy"
- Usuário vendo dados de outro usuário
- Session expirada silenciosamente

**Abordagem:**
```typescript
// Verificar quem está autenticado
const { data: { user } } = await supabase.auth.getUser()
console.log('[debug] Current user:', user?.id)

// Testar query com service role para descartar RLS
const adminSupabase = createServiceRoleClient()
const { data, error } = await adminSupabase
  .from('transactions')
  .select('*')
  .eq('user_id', user?.id)
console.log('[debug] Admin query result:', data?.length, 'error:', error)

// Verificar política RLS no banco
// No Supabase Studio: Authentication > Policies
```

**Checklist:**
- [ ] `supabase.auth.getUser()` está sendo chamado (não `getSession()`)?
- [ ] O client Supabase no servidor está usando cookies corretamente (`createServerClient`)?
- [ ] A política RLS está usando `auth.uid()` (não `auth.jwt()->'sub'`)?
- [ ] O user_id sendo inserido é `user.id` (não `session.user.id`)?

---

### Webhook Asaas

**Sintomas comuns:**
- Webhook recebido mas plano não atualiza
- Erro 401 mesmo com token correto
- Eventos chegando mas sendo ignorados

**Abordagem:**
```typescript
// Log completo do webhook
console.log('[webhook/asaas] Headers:', Object.fromEntries(request.headers))
console.log('[webhook/asaas] Body:', await request.clone().text())

// Verificar token
const receivedToken = request.headers.get('asaas-access-token')
const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
console.log('[webhook] Token match:', receivedToken === expectedToken)
console.log('[webhook] Received token length:', receivedToken?.length)
console.log('[webhook] Expected token length:', expectedToken?.length)
```

**Checklist:**
- [ ] `ASAAS_WEBHOOK_TOKEN` está configurado no `.env.local`?
- [ ] O evento recebido tem o formato esperado? (verificar `event.payment.status`)
- [ ] O trigger do banco está sincronizando `profiles.plan` após update em `subscriptions`?
- [ ] O webhook responde em < 5s? (Asaas faz timeout e re-tenta)

---

### Chat IA (Streaming)

**Sintomas comuns:**
- Stream não aparece no frontend (conexão fecha imediatamente)
- Resposta truncada
- Rate limit sendo ignorado

**Abordagem:**
```typescript
// Verificar se o quota foi verificado antes do stream
const profile = await getProfile(user.id, supabase)
console.log('[debug] AI queries today:', profile.ai_queries_today)
console.log('[debug] Quota reset at:', profile.ai_queries_reset_at)

// Testar stream isoladamente
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"message": "quanto gastei esse mês?"}' \
  --no-buffer
```

**Checklist:**
- [ ] Response headers incluem `Content-Type: text/event-stream`?
- [ ] `Cache-Control: no-cache` está presente?
- [ ] O Vercel Hobby tem timeout de 10s — stream deve começar antes disso?
- [ ] O contexto de transações não excede o context window do Sonnet?

---

### Performance / Lentidão

**Abordagem:**
```typescript
// Medir tempo de operações críticas
console.time('[perf] parse-ofx')
const parsed = await parseOFX(content)
console.timeEnd('[perf] parse-ofx')

console.time('[perf] categorize-batch')
const categorized = await categorizeBatch(parsed)
console.timeEnd('[perf] categorize-batch')
```

**Causas comuns:**
- N+1 queries: categorizar transação por transação vs batch
- Sem índices nas queries frequentes (`idx_transactions_user_date`)
- Cache miss alto: normalização de descrição inconsistente
- Context window grande no chat: resumir transações antes de enviar

---

## Ferramentas de Diagnóstico

```bash
# Ver logs do Supabase local
supabase logs --tail 100

# Testar endpoint diretamente
curl -X GET http://localhost:3000/api/health | jq

# Verificar tipos gerados estão atualizados
supabase gen types typescript --local | diff - src/lib/supabase/types.ts

# Rodar teste específico em modo verbose
npx vitest run tests/unit/parsers/ofx-parser.test.ts --reporter=verbose

# Verificar se RLS está habilitado
supabase db execute "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'"
```
