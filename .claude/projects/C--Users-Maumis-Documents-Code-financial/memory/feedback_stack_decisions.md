---
name: Decisoes tecnicas de stack confirmadas
description: Decisoes de arquitetura confirmadas pelo usuario - Supabase-first, App Router, shadcn/ui, API Routes only for server logic
type: feedback
---

Decisoes tecnicas confirmadas em 2026-04-05:

- **Supabase-first:** Frontend fala direto com Supabase para CRUD. API Routes APENAS para IA, parsing de arquivos e webhooks de pagamento.
- **Next.js API Routes** para tudo no MVP (sem Supabase Edge Functions)
- **App Router** (nao Pages Router)
- **shadcn/ui + Tailwind CSS** para estilizacao
- **Haiku 4.5** para categorizacao batch, **Sonnet 4.6** para chat
- **Rate limiting duplo:** Supabase (regra de negocio) + middleware (protecao tecnica)
- **PWA manifest basico** no MVP (icone + splash, sem offline real)

**Why:** Dev solo com budget limitado. Cada decisao prioriza simplicidade, velocidade de desenvolvimento e menor numero de camadas.

**How to apply:** Nao adicionar camadas desnecessarias entre frontend e Supabase. Nao criar API routes para operacoes CRUD simples. RLS do Supabase e a camada de seguranca para dados do usuario.
