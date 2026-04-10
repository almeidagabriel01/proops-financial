# AI Integration Roadmap

Status atual: **stubs funcionais** — categorização salva `category='outros'`, chat/áudio não implementados.
Este documento registra todos os pontos de integração de IA que aguardam configuração de chaves.

---

## Pontos de Integração de IA

### 1. Categorização de Transações (Edge Function)

| Campo | Valor |
|-------|-------|
| **Arquivo** | `supabase/functions/categorize-import/index.ts` |
| **Status** | Stub funcionando — salva `category='outros'` para todas as transações |
| **Epic** | 1 (Foundation) |

**O que falta:**
Configurar uma das chaves abaixo como secret no Supabase e descomentar o Tier 3 da Edge Function:

```bash
supabase secrets set GROQ_API_KEY=xxx          # Groq — gratuito
supabase secrets set GOOGLE_AI_API_KEY=xxx     # Gemini Flash — gratuito
supabase secrets set ANTHROPIC_API_KEY=xxx     # Claude Haiku — US$5 inicial
```

**Impacto:** Transações ficam como `outros` até implementar. Nenhuma funcionalidade quebrada.

**Provider recomendado:** Groq (gratuito, llama-3.1-8b-instant) ou Gemini Flash (gratuito, quota generosa).

---

### 2. Chat Conversacional (Epic 3 — Pro)

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/app/api/chat/route.ts` *(a criar no Epic 3)* |
| **Status** | Não implementado |
| **Epic** | 3 (Premium) |

**O que falta:**
`ANTHROPIC_API_KEY` configurada no `.env.local` / Vercel environment variables.
Este é o único ponto onde Claude Sonnet é recomendado — melhor PT-BR para conversação financeira.

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-xxx
```

**Impacto:** Feature de chat bloqueada até implementar. Não afeta Free tier.

**Modelo:** `claude-sonnet-4-6` — streaming, PT-BR superior, 20 msgs/dia por usuário Premium.

---

### 3. Entrada por Áudio (Epic 3 — Pro)

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/app/api/audio/route.ts` |
| **Status** | ✅ implementado — Groq Whisper (`whisper-large-v3-turbo`) |
| **Epic** | 3 (Premium) |

**Provider:** Groq Whisper — gratuito, sem cartão de crédito.

```bash
# .env.local
GROQ_API_KEY=gsk_xxx   # console.groq.com
```

**Impacto:** Feature de áudio funcional para usuários Pro com `audio_enabled=true`.

---

### 4. Function Calling — Ações via Chat (Epic 3 — Pro)

| Campo | Valor |
|-------|-------|
| **Arquivo** | `src/app/api/chat/route.ts` *(a criar no Epic 3)* |
| **Status** | Não implementado |
| **Epic** | 3 (Premium) |

**O que falta:** Depende do item 2 (chat) estar funcionando. Usa a mesma `ANTHROPIC_API_KEY`.

**Impacto:** Bloqueado pelo chat. Implementar junto com o item 2.

---

## Ordem Recomendada para Implementar IA

| Prioridade | Feature | Provider | Custo | Esforço |
|-----------|---------|----------|-------|---------|
| 1 | Categorização automática | Groq (llama-3.1-8b-instant) | Gratuito | Baixo — descomentar Tier 3 |
| 2 | Chat conversacional | Claude Sonnet 4.6 | US$5 inicial | Médio — criar route + UI |
| 3 | Entrada por áudio | Groq Whisper | Gratuito | ✅ implementado |
| 4 | Function calling | Claude Sonnet 4.6 | Incluso no item 2 | Alto — tool definitions |

---

## Variáveis de Ambiente Necessárias

Adicionar ao `.env.local` conforme for implementando cada feature:

```bash
# ──────────────────────────────────────────────
# Categorização de Transações (Item 1)
# Escolher apenas UM provider:
# ──────────────────────────────────────────────

# Opção A — Groq (RECOMENDADO — gratuito)
# Modelos: llama-3.1-8b-instant, llama-3.3-70b-versatile
# Console: https://console.groq.com/keys
GROQ_API_KEY=

# Opção B — Google Gemini Flash (gratuito)
# Console: https://aistudio.google.com/apikey
GOOGLE_AI_API_KEY=

# Opção C — Anthropic Claude Haiku (US$5 inicial)
# Console: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# ──────────────────────────────────────────────
# Chat Conversacional + Function Calling (Itens 2 e 4)
# ──────────────────────────────────────────────

# Anthropic Claude Sonnet 4.6 — OBRIGATÓRIO para chat Premium
# (pode reutilizar a mesma chave do item 1 se escolheu Anthropic)
# Console: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# ──────────────────────────────────────────────
# Entrada por Áudio (Item 3)
# Escolher apenas UM provider:
# ──────────────────────────────────────────────

# Opção A — Groq Whisper (RECOMENDADO — gratuito)
# (pode reutilizar a mesma chave da categorização se escolheu Groq)
GROQ_API_KEY=

# Opção B — OpenAI Whisper (US$0.006/minuto)
# Console: https://platform.openai.com/api-keys
OPENAI_API_KEY=
```

> **Nota Supabase:** Chaves usadas nas Edge Functions devem ser configuradas também via
> `supabase secrets set NOME_VAR=valor` (não basta o `.env.local`).
