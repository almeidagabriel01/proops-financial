---
name: api-design-principles
description: "Princípios de design de API para Next.js API Routes do App Financeiro. Use quando: criando novas API routes, revisando endpoints existentes, projetando contratos de request/response, ou implementando middleware de autenticação e rate limiting. Foco em rotas server-side do Next.js App Router."
metadata:
  author: project
  version: "1.0.0"
---

# API Design Principles — App Financeiro Pessoal

## Contexto

APIs Next.js App Router em `src/app/api/`. Server-only — nunca expor lógica de negócio no cliente.

**Endpoints existentes:**
- `POST /api/import` — parse OFX/CSV + categorizar + salvar (max 5MB, max 30s)
- `POST /api/chat` — stream resposta IA (Premium, 20 msgs/dia)
- `POST /api/webhook/asaas` — eventos de pagamento
- `GET /api/health` — status das dependências

---

## Estrutura Padrão de Route Handler

```typescript
// src/app/api/[endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // 1. Autenticação — SEMPRE primeiro
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // 2. Validação de input
  let body: ExpectedBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // 3. Autorização de plano (se Premium)
  // ... verificar profile.plan server-side

  // 4. Lógica de negócio (via src/lib/)
  // ... chamar funções de src/lib/, nunca implementar aqui

  // 5. Resposta padronizada
  return NextResponse.json({ data: result }, { status: 200 })
}
```

---

## Contratos de Request/Response

### Padrão de resposta
```typescript
// Sucesso
{ "data": <resultado> }                    // 200, 201

// Erro do cliente
{ "error": "Mensagem clara em PT-BR" }    // 400, 401, 403, 404, 409

// Erro do servidor
{ "error": "Erro interno. Tente novamente." }  // 500
```

### Nunca expor detalhes internos
```typescript
// ERRADO — expõe stack trace
return NextResponse.json({ error: error.stack }, { status: 500 })

// CORRETO — mensagem genérica ao cliente, log interno
console.error('[api/import] Parse error:', error)
return NextResponse.json({ error: 'Falha ao processar o arquivo' }, { status: 500 })
```

---

## Padrões por Endpoint

### /api/import (upload de arquivo)

```typescript
// Validações obrigatórias
const formData = await request.formData()
const file = formData.get('file') as File

if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo muito grande (max 5MB)' }, { status: 413 })

const ext = file.name.split('.').pop()?.toLowerCase()
if (!['ofx', 'csv'].includes(ext ?? '')) {
  return NextResponse.json({ error: 'Formato não suportado. Use OFX ou CSV.' }, { status: 415 })
}

// Response imediata com import_id — processamento async
return NextResponse.json({ data: { import_id, status: 'processing' } }, { status: 202 })
```

### /api/chat (streaming)

```typescript
// Streaming com Vercel AI SDK ou ReadableStream
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of anthropicStream) {
      controller.enqueue(new TextEncoder().encode(chunk))
    }
    controller.close()
  }
})

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
})
```

### /api/webhook/asaas

```typescript
// Validar token ANTES de qualquer processamento
const token = request.headers.get('asaas-access-token')
if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
  return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
}

// Responder rápido (< 5s) — processar async se necessário
// Asaas re-tenta em caso de timeout
```

### /api/health

```typescript
// Verificar todas as dependências
const checks = await Promise.allSettled([
  supabase.from('profiles').select('id').limit(1),  // DB
  fetch('https://api.anthropic.com/v1/messages', { method: 'HEAD' }),  // Claude API
])

return NextResponse.json({
  status: checks.every(c => c.status === 'fulfilled') ? 'ok' : 'degraded',
  checks: {
    database: checks[0].status === 'fulfilled' ? 'ok' : 'error',
    ai: checks[1].status === 'fulfilled' ? 'ok' : 'error',
  },
  timestamp: new Date().toISOString()
})
```

---

## Rate Limiting

### /api/chat — 20 msgs/dia por usuário Premium
```typescript
import { checkAndIncrementAIQuota } from '@/lib/utils/rate-limit'

const allowed = await checkAndIncrementAIQuota(user.id, supabase)
if (!allowed) {
  return NextResponse.json({
    error: 'Limite diário de perguntas atingido (20/dia). Tente novamente amanhã.'
  }, { status: 429 })
}
```

---

## HTTP Status Codes

| Situação | Status |
|---------|--------|
| Sucesso com dados | 200 |
| Criado (import iniciado) | 202 (async) |
| Request inválido | 400 |
| Não autenticado | 401 |
| Sem permissão (plano) | 403 |
| Não encontrado | 404 |
| Conflito (duplicata) | 409 |
| Arquivo muito grande | 413 |
| Tipo não suportado | 415 |
| Rate limit | 429 |
| Erro interno | 500 |

---

## Não Fazer

- Lógica de negócio diretamente no route handler — vai em `src/lib/`
- `try/catch` vazio sem log
- Expor mensagens de erro internas ao cliente
- Processar sem verificar autenticação primeiro
- Usar `getSession()` para autorização (pode estar stale — usar `getUser()`)
- Responder com 200 para erros (facilita debugging)
