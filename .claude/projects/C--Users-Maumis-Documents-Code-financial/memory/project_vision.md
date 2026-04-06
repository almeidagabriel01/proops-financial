---
name: Visao do produto financeiro
description: Decisoes de produto confirmadas pelo usuario - MVP scope, persona, modelo de negocio, stack, timeline
type: project
---

**Produto:** App financeiro PF para o Brasil (nome a definir)

**Elevator pitch:** App que ajuda pessoa fisica brasileira a se organizar financeiramente melhor e ter visao futura e clara dos gastos, de um jeito facil e pratico.

**Resultado desejado:** Usuario sabe pra onde vai o dinheiro sem esforco, para de fechar o mes no vermelho, consegue realizar objetivos financeiros que achava impossiveis.

**Persona primaria:** Trabalhador CLT, 28-38 anos, renda R$3.000-8.000. Tem emprego fixo mas nao entende pra onde vai o dinheiro. Nao e desorganizado — nunca teve ferramenta que funcionasse pro ritmo de vida dele. Hoje usa planilha que abandona ou olha extrato quando ja e tarde.

**MVP (3 features):**
1. Importar extrato (OFX/CSV) e mostrar tudo organizado automaticamente
2. Categorizar gastos com IA sem input do usuario
3. Responder perguntas em PT-BR natural sobre os dados reais

**Problema #1 a resolver:** Visibilidade — "nao sei pra onde vai meu dinheiro"

**IA no MVP:** Categoriza nos bastidores + responde perguntas. Usuario nao precisa saber que tem IA — so precisa sentir que o app entende ele.

**WhatsApp:** Fora do MVP. Entra na v2 como alertas + consultas rapidas.

**Modelo de negocio:** Free limitado (importacao, categorizacao simples, mes atual). Premium R$15-30/mes (IA conversacional, historico, planejamento, multiplas contas). Trial 7 dias ativado automaticamente.

**Momento magico:** IA responde a primeira pergunta em PT-BR com precisao usando dados reais. "Quanto gastei com iFood em marco?" e a resposta bate.

**Stack confirmada (retificada 2026-04-05):**
- Frontend: Next.js (web mobile-first, PWA opcional) na Vercel
- Backend: Next.js API Routes + Supabase Edge Functions
- Banco: Supabase (PostgreSQL gerenciado + Auth + Storage + Realtime)
- Auth: Supabase Auth (email/senha, Google OAuth)
- IA: Claude API (Anthropic)
- Pagamentos: Asaas (cartao, boleto, Pix)
- SEM React Native, SEM App Store/Play Store no MVP
- SEM Open Finance API no MVP (OFX/CSV)

**Timeline:** 3-4 meses para MVP.

**Why:** Usuario quer validar produto com custo minimo antes de escalar. Foco em qualidade e experiencia, nao em quantidade de features.

**How to apply:** Todas as decisoes de arquitetura, escopo e priorizacao devem respeitar: budget limitado, dev solo com Claude Code, MVP enxuto de 3 features, web mobile-first. Supabase free tier + Vercel free tier como base de infra.
