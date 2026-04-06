---
name: security-auditor
description: "Auditoria de segurança OWASP Top 10 para o App Financeiro Pessoal. Use quando: revisando código que toca autenticação, RLS, API routes, webhooks, variáveis de ambiente, dados financeiros de usuários, ou conformidade LGPD. Triggers: qualquer mudança em supabase/migrations/, src/app/api/, src/lib/supabase/, src/middleware.ts, ou variáveis de ambiente."
metadata:
  author: project
  version: "1.0.0"
---

# Security Auditor — App Financeiro Pessoal com IA

## Contexto de Ameaças

Aplicação SaaS financeiro com dados sensíveis de usuários brasileiros. Vetores de risco principais:
- Vazamento de dados financeiros entre usuários (broken access control)
- Exposição de chaves de API (service_role, ANTHROPIC_API_KEY, ASAAS_API_KEY)
- Bypass de verificação de plano Premium (autorização inadequada)
- Manipulação de webhooks de pagamento (Asaas)
- Não-conformidade LGPD (dados pessoais sensíveis)

---

## Checklist por Área

### 1. Supabase RLS (Prioridade CRÍTICA)

```sql
-- Verificar: toda tabela do schema public tem RLS?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- rowsecurity deve ser TRUE para todas

-- Verificar: políticas existem?
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

**Armadilhas comuns:**
- `user_metadata` em JWT é editável pelo usuário — nunca usar em políticas RLS
- Views **bypassam RLS** por padrão — usar `WITH (security_invoker = true)` no Postgres 15+
- UPDATE sem política SELECT → silenciosamente falha (0 rows afetadas)
- Funções `SECURITY DEFINER` em schema `public` → acessíveis via Data API

### 2. Variáveis de Ambiente

**Nunca expor no cliente:**
```bash
# ERRADO — vai para o browser
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_ANTHROPIC_API_KEY=...

# CORRETO — server-side apenas
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
ASAAS_API_KEY=...
ASAAS_WEBHOOK_TOKEN=...
```

**Verificar em código:**
```bash
# Buscar vazamentos de credenciais em código
grep -r "service_role" src/ --include="*.ts" --include="*.tsx"
grep -r "ANTHROPIC" src/ --include="*.ts" --include="*.tsx"
# Resultado deve ser apenas em server-side files (lib/supabase/server.ts, api routes)
```

### 3. Autenticação e Sessões

```typescript
// CORRETO — verifica sessão server-side (não pode ser falsificada)
const { data: { user } } = await supabase.auth.getUser()

// CUIDADO — getSession() pode estar stale, não usar para autorização crítica
const { data: { session } } = await supabase.auth.getSession()
```

**Verificar em toda API route:**
```typescript
// Padrão obrigatório em todas as rotas protegidas
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

### 4. Verificação de Plano Premium (Server-Side Obrigatória)

```typescript
// NUNCA — confiar apenas em header/cookie do frontend
// SEMPRE — verificar no banco server-side
const { data: profile } = await supabase
  .from('profiles')
  .select('plan, trial_ends_at')
  .eq('id', user.id)
  .single()

const isPremium =
  profile?.plan === 'premium' ||
  (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date())

if (!isPremium) {
  return NextResponse.json({ error: 'Plano Premium necessário' }, { status: 403 })
}
```

### 5. Webhook Asaas

```typescript
// Validar token antes de processar qualquer evento
const webhookToken = request.headers.get('asaas-access-token')
if (webhookToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
  return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
}
```

### 6. Upload de Arquivos (OFX/CSV)

```typescript
// Validações obrigatórias
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['text/xml', 'application/x-ofx', 'text/csv', 'text/plain']

if (file.size > MAX_SIZE) throw new Error('Arquivo muito grande (max 5MB)')
if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Formato não suportado')

// Sanitizar path no Storage — nunca usar nome original do arquivo diretamente
const safePath = `${userId}/${crypto.randomUUID()}.${extension}`
```

### 7. Prompts de IA — Injection Prevention

```typescript
// NUNCA interpolar dados do usuário diretamente no system prompt
// ERRADO:
const prompt = `Você é um assistente. O usuário disse: ${userMessage}`

// CORRETO — separar system prompt de user input via roles da API
const messages = [
  { role: 'user', content: userMessage }  // input do usuário isolado
]
// system prompt é separado e não contém dados do usuário
```

### 8. LGPD — Conformidade

**Implementações obrigatórias:**
- [ ] Consentimento explícito coletado no cadastro (checkbox marcado, não pré-marcado)
- [ ] Endpoint de exclusão total de conta e dados (`DELETE /api/account`)
- [ ] Política de privacidade acessível no app (link no footer/settings)
- [ ] Dados financeiros não enviados para analytics de terceiros
- [ ] Sentry: mascarar dados financeiros antes de enviar eventos

```typescript
// Sentry — nunca logar dados financeiros
Sentry.configureScope(scope => {
  scope.addEventProcessor(event => {
    // Remover dados financeiros de breadcrumbs e extras
    if (event.extra?.transactions) delete event.extra.transactions
    return event
  })
})
```

---

## Red Flags — Parar e Revisar Imediatamente

- `NEXT_PUBLIC_` em qualquer chave secreta
- `auth.uid()` ausente em política RLS
- `supabase.auth.getSession()` usado para autorização (vs `getUser()`)
- Webhook processado sem validação de token
- SQL string interpolation: `\`SELECT * FROM ... WHERE id = '${userId}'\``
- `security definer` em função no schema `public`
- Dados de transações em logs de erro sem mascaramento

---

## Comandos de Verificação

```bash
# Verificar se há secrets em variáveis públicas
grep -r "NEXT_PUBLIC_" .env* | grep -i "key\|secret\|token\|password"

# Verificar RLS em todas as tabelas
supabase db execute "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'"

# Verificar se service_role é referenciado no cliente
grep -r "service_role" src/app --include="*.tsx" --include="*.ts"
```
