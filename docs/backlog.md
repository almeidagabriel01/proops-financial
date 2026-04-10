# Backlog — Features Pendentes

Features identificadas mas fora do escopo dos Epics 1–4 do MVP.
Cada item lista o Epic mais adequado para inclusão e a prioridade de negócio.

---

## Cadastro Manual de Transação

**Prioridade:** Alta
**Epic sugerido:** Epic 1 (Foundation) — extensão da Story 1.4
**Descrição:** Usuário cria uma transação manualmente (sem importar extrato). Necessário para despesas pagas em dinheiro, reembolsos, e entradas não registradas pelo banco.

**Escopo mínimo:**
- Formulário: data, descrição, valor, tipo (débito/crédito), categoria
- `external_id` gerado como `manual_{uuid}` (distingue de OFX/CSV)
- Transação manual não participa do dedup por FITID/SHA-256
- IA categoriza automaticamente ao salvar (Tier 1/2 → Haiku se necessário)

**Por que Alta:** Sem isso, usuários com despesas em dinheiro têm dados incompletos no dashboard, reduzindo utilidade do produto.

---

## Receita Recorrente (Detecção Automática)

**Prioridade:** Média
**Epic sugerido:** Epic 2 (IA) — extensão pós-Story 2.1/2.2
**Descrição:** Detectar automaticamente transações recorrentes (salário mensal, aluguel recebido, freelances periódicos) e marcá-las como recorrentes no dashboard.

**Escopo mínimo:**
- Algoritmo: transações com mesma descrição normalizada, mesmo valor ±5%, periodicidade ≥ 28 dias
- Campo `is_recurring boolean` na tabela `transactions`
- Dashboard: badge "Recorrente" nas transações detectadas
- Sem UI de cadastro manual de recorrência no MVP

**Por que Média:** Melhora a experiência de usuários com renda estável, mas o produto funciona sem isso.

---

## Projeções Financeiras Futuras

**Prioridade:** Média
**Epic sugerido:** Epic 3 (Premium Chat) — feature exclusiva Pro
**Descrição:** Projetar saldo e gastos para os próximos 30/60/90 dias baseado em histórico e transações recorrentes detectadas.

**Escopo mínimo:**
- Requer "Receita Recorrente" implementada (dependência)
- Cálculo server-side: média de gastos por categoria (últimos 3 meses) + recorrentes confirmados
- Exibição: gráfico de linha simples (saldo projetado vs real)
- Exclusivo para usuários Pro (via `getEffectiveTier`)
- Disponível como function call no chat IA Pro

**Por que Média:** Feature diferenciadora para retenção Pro, mas requer dados históricos suficientes para ser útil.

---

## Antecipações e Compromissos Futuros

**Prioridade:** Baixa
**Epic sugerido:** Epic 4 (Polish) ou Epic 5 futuro
**Descrição:** Usuário registra compromissos futuros (boleto a vencer, parcela de cartão, IPVA parcelado) que ainda não aparecem no extrato. Permite planejamento de caixa.

**Escopo mínimo:**
- Nova tabela `commitments` (data_vencimento, descrição, valor, categoria, recorrente)
- UI: tela de compromissos (separada de transações)
- Dashboard: seção "A pagar" com soma de compromissos dos próximos 30 dias
- Sem integração com extrato (commitments são manuais)

**Por que Baixa:** Aumenta complexidade de UX significativamente. Usuários do MVP provavelmente priorizam entender o passado antes de planejar o futuro. Candidato a Epic 5.

---

## Resumo de Priorização

| Feature | Prioridade | Epic | Dependências |
|---------|-----------|------|-------------|
| Cadastro manual de transação | Alta | Epic 1 ext. | Nenhuma |
| Receita recorrente (detecção) | Média | Epic 2 ext. | Nenhuma |
| Projeções financeiras | Média | Epic 3 | Receita recorrente |
| Antecipações e compromissos | Baixa | Epic 4/5 | Nenhuma |

---

## Tech Debt — Migração Asaas → Stripe (CPF/CNPJ e plano anual)

**Prioridade:** Alta (pré-launch)
**Origem:** Auditoria QA 2026-04-10 (C-2 + M3)
**Descrição:** Dois itens bloqueadores serão resolvidos na migração para Stripe:

1. **CPF/CNPJ:** Asaas exige CPF/CNPJ para cobranças reais. A coleta desse dado não foi implementada no onboarding. Na migração para Stripe, o gateway não exige CPF/CNPJ, eliminando o problema.

2. **Plano anual:** O checkout atual é hardcoded para `pro_monthly`. A tabela `PLANS` já define `pro_yearly` (R$479/ano ≈ 2 meses grátis). A UI de upgrade deve expor a opção anual. Será implementado junto com a integração Stripe.

**Status:** Aguardando decisão de migração de gateway de pagamento.

---

## Tech Debt — usage_count no category_dictionary

**Prioridade:** Baixa
**Epic sugerido:** Epic 2 ext. (pós-MVP)
**Origem:** Story 2.2 m2 (QA Review 2026-04-07)
**Descrição:** `saveCorrection()` sempre envia `usage_count: 1` no upsert do `category_dictionary`. O Supabase JS substitui o campo no conflito em vez de incrementar. O AC3 da Story 2.2 especifica `usage_count=usage_count+1`.

**Fix necessário:** Criar RPC `increment_category_usage(user_id, description_pattern, category)` que execute o UPDATE com `usage_count = usage_count + 1` no banco e chamá-la em substituição ao upsert direto, ou executar o incremento via SQL raw.

**Impacto atual:** Baixo — a contagem de uso não é exibida para o usuário nem influencia decisões de categorização no MVP. O dicionário funciona corretamente para lookup (Tier 1); apenas o contador fica incorreto.

---

*Última atualização: 2026-04-10*

---

## Tech Debt — Story 4.4 (PWA & Performance)

### M1 — PWAInstallBanner usa sessionStorage para dismissal

**Prioridade:** Baixa
**Origem:** Story 4.4 M1 (QA Review 2026-04-07)
**Arquivo:** `src/components/layout/pwa-install-banner.tsx`
**Descrição:** `DISMISSED_KEY` armazenado em `sessionStorage` — ao fechar e reabrir o browser o banner reaparece, mesmo que o usuário já tenha dispensado. `localStorage` seria mais adequado para dismissal permanente e experiência não-intrusiva.
**Fix:** Trocar `sessionStorage` por `localStorage` para o `DISMISSED_KEY`.

---

### M2 — SW disable usa `=== 'development'` em vez de `!== 'production'`

**Prioridade:** Baixa
**Origem:** Story 4.4 M2 (QA Review 2026-04-07)
**Arquivo:** `next.config.ts`
**Descrição:** `disable: process.env.NODE_ENV === 'development'` — o service worker NÃO é desabilitado em `NODE_ENV === 'test'`. Sem impacto prático (testes unitários não constroem SW), mas tecnicamente impreciso.
**Fix:** `disable: process.env.NODE_ENV !== 'production'`

---

### M3 — lighthouserc.js: `preset: 'desktop'` conflita com `formFactor: 'mobile'`

**Prioridade:** Baixa
**Origem:** Story 4.4 M3 (QA Review 2026-04-07)
**Arquivo:** `lighthouserc.js`
**Descrição:** `preset: 'desktop'` define defaults de desktop que são parcialmente sobrescritos por `formFactor: 'mobile'` e `screenEmulation` explícitos. Configuração inconsistente que pode gerar resultados unreliable.
**Status:** ✅ Corrigido em commit junto com Story 4.5 (linha `preset: 'desktop'` removida).

---

### M4 — `npm run lighthouse` usa dev server (SW desabilitado)

**Prioridade:** Baixa
**Origem:** Story 4.4 M4 (QA Review 2026-04-07)
**Arquivo:** `lighthouserc.js`
**Descrição:** `startServerCommand: 'npm run dev'` inicia Turbopack com SW desabilitado (`NODE_ENV === 'development'`). Audit PWA e performance não representam produção.
**Fix:** Usar `startServerCommand: 'npm run build && npm run start'` para audit com SW ativo.

---

## Tech Debt — Story 4.2 (LGPD, Gestão de Dados & Offline)

### m1 — a.click() sem append ao DOM no export de dados

**Prioridade:** Baixa
**Origem:** Story 4.2 m1 (QA Review 2026-04-07)
**Arquivo:** `src/app/(app)/settings/page.tsx` — `handleExport()`
**Descrição:** Download do JSON usa `a.click()` sem `document.body.appendChild(a)`. Funcional em Chrome/Android (85% do mercado-alvo), mas padrão não-canônico que pode falhar em browsers antigos.
**Fix:** `document.body.appendChild(a); a.click(); document.body.removeChild(a);`

---

### m2 — Timer de timeout do chat reinicia em transição submitted→streaming

**Prioridade:** Baixa
**Origem:** Story 4.2 m2 (QA Review 2026-04-07)
**Arquivo:** `src/app/(app)/chat/page.tsx`
**Descrição:** useEffect com `[status]` reseta o timer de 30s na transição de status. AC especifica "30s sem novos tokens" (tracking de chegada de tokens), mas implementação monitora status. Comportamento correto na prática; desvio semântico.
**Fix:** Rastrear chegada de tokens via evento do stream, não transições de status.

---

### m3 — Cache offline não implementado (AC4 parcial — Story 4.2)

**Prioridade:** Média
**Origem:** Story 4.2 m3 (QA Review 2026-04-07)
**Descrição:** Banner offline implementado mas sem: cache React Query para dashboard em modo offline; mensagem "Sem conexão" nos formulários de chat e import quando offline.
**Fix:** Configurar `staleTime` no React Query + verificação `isOnline` nos formulários.

---

### m4 — Teste de ownership ausente em DELETE /api/user/account

**Prioridade:** Baixa
**Origem:** Story 4.2 m4 (QA Review 2026-04-07)
**Arquivo:** `tests/unit/api/user-delete.test.ts`
**Descrição:** Teste de deleção não verifica que usuário A não pode deletar conta de usuário B. Proteção existe via server-side auth; falta cobertura de teste.
**Fix:** Adicionar teste documentando que queries usam user_id do auth context, não de parâmetros da request.

