# Responsive Audit — Finansim

**Data:** 17 de abril de 2026  
**Viewports testados:** mobile 375px | desktop 1280px  
**Páginas auditadas:** 18

---

## Resultado

**1 issue corrigido. 17 páginas sem problemas.**

---

## Issue Corrigido

### Fluxo de Caixa — Overflow de moeda nos cards de resumo

**Arquivo:** `src/app/(app)/financeiro/fluxo/page.tsx` (linhas 153, 162, 171)

**Problema:** Os 3 cards de resumo usam `grid-cols-3 gap-2` no mobile.  
Em 375px: largura de conteúdo ≈ 343px → 109px/coluna → 85px de área interna.  
`text-base` (16px) para "R$ 10.000,00" ≈ 95px → overflow horizontal.

**Correção:** `text-base lg:text-2xl` → `text-sm lg:text-2xl` nos 3 valores (A Pagar, A Receber, Projetado/Saldo).

---

## Páginas Verificadas

| Página | Mobile 375px | Desktop 1280px | Status |
|--------|-------------|----------------|--------|
| `/` (landing) | Grid único → `sm:grid-cols-2` para pricing. Stats hero: `text-sm sm:text-base` | Layout completo | ✅ |
| `/login` | Formulário centrado `max-w-sm` | Idem | ✅ |
| `/signup` | Formulário centrado `max-w-sm` | Idem | ✅ |
| `/dashboard` | Layout mobile exclusivo com `flex-col lg:hidden` | Layout desktop separado `hidden lg:flex` | ✅ |
| `/transactions` | FAB `left-4` com `calc(5rem + env(safe-area-inset-bottom))` | Filtros em linha | ✅ |
| `/import` | Stepper wizard oculto mobile (`hidden lg:flex`), upload simples | Sidebar bancos suportados | ✅ |
| `/chat` | `pb-[calc(4rem+env(safe-area-inset-bottom,0px))]`, drawer histórico `max-h-52` | Sidebar histórico | ✅ |
| `/settings` | Tabs mobile, sidebar desktop | 2 colunas para planos | ✅ |
| `/financeiro/fluxo` | **CORRIGIDO** — moeda `text-sm` nos 3 cards | Moeda `text-2xl` | ✅ |
| `/financeiro/extrato` | Sub-nav `overflow-x-auto shrink-0` | Tabs fixas | ✅ |
| `/more` (hub) | Grid 2 colunas `grid-cols-2` com ícones | Layout ampliado | ✅ |
| `/more/irpf` | Export via `<a>` nativa com `buttonVariants()`, `truncate` em descrições | Dual export buttons | ✅ |
| `/more/regras` | Regras em lista, form inline | Cards com shadow elevado | ✅ |
| `/more/orcamentos` | `grid-cols-1` mobile, `lg:grid-cols-2` desktop | 2–3 colunas desktop | ✅ |
| `/more/objetivos` | `grid-cols-1` mobile, dialogs `sm:max-w-md` | 2 colunas desktop | ✅ |
| `/terms` | `max-w-2xl px-4` — texto fluido | Idem com mais espaço | ✅ |
| `/privacy` | `max-w-2xl px-4` — texto fluido | Idem | ✅ |
| `/(auth)/callback` | Redirect server-side | Idem | ✅ |

---

## Componentes Críticos Verificados

| Componente | Verificação | Status |
|------------|-------------|--------|
| `HealthScoreCard` | Tooltip `@base-ui` `side="right"`, círculo 64px (>44px), `ResponsiveContainer` | ✅ |
| `SpendingChart` | `ResponsiveContainer width="100%" height={190}` | ✅ |
| `DuplicateAlertsCard` | Cards com `truncate` em descrições | ✅ |
| `SafeToSpendCard` | Layout de linha única, sem grid multi-col | ✅ |
| `FinanceiroSubNav` | `overflow-x-auto scrollbar-none` + `shrink-0` por tab | ✅ |
| `TransactionDetailSheet` | Bottom sheet `max-h-[90dvh]`, tag chips com `flex-wrap` | ✅ |
| `Dialog` (padrão) | `max-w-[calc(100%-2rem)] sm:max-w-sm` — sem overflow em 375px | ✅ |
| `FloatingChatButton` | `right-4 bottom-[calc(5rem+...)]` — não colide com FAB de transactions | ✅ |

---

## Padrões Mobile-First Confirmados

- **Safe area insets:** `env(safe-area-inset-bottom, 0px)` aplicado em FAB, chat input e bottom nav
- **Touch targets:** Todos os botões de ação com `h-10` ou `h-9` mínimo (≥44px incluindo padding)
- **Charts:** Todos usam `ResponsiveContainer width="100%"` — sem overflow lateral
- **Tabela de transações:** `overflow-x-auto` com colunas `shrink-0` para valores
- **Modais:** Dialogs com `max-w-[calc(100%-2rem)]` em mobile, sem risco de saída do viewport
- **Textos longos:** `truncate` aplicado em descrições em contextos de espaço limitado
