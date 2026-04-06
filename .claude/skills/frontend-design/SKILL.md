---
name: frontend-design
description: "UI/UX design para web apps financeiros mobile-first. Use quando precisar de: decisões de layout/componentes, paleta de cores para fintech, padrões de UX para mobile Android, acessibilidade WCAG AA, design de dashboards financeiros com shadcn/ui + Tailwind, feedback visual de estados (loading/error/empty), ou revisão de componentes React para o App Financeiro."
metadata:
  author: project
  version: "1.0.0"
---

# Frontend Design — App Financeiro Pessoal

## Contexto do Produto

SaaS financeiro pessoal mobile-first para o Brasil. Persona: CLT 28-38 anos, classe B/C, 85% Android.
Referência visual: Nubank (confiança + modernidade), Cleo UK (personalidade acessível).
**Não é um banco corporativo. Não é gamificado.** É sério mas acessível.

---

## Princípios de Design

1. **Glanceable first:** Informação principal visível sem scroll. 3 segundos para entender a situação financeira
2. **Zero-input feel:** O app trabalha pelo usuário — nada para digitar após importar o extrato
3. **Mobile-first absoluto:** Projetar para 375px (iPhone SE / Android entrada), depois expandir
4. **Progressive disclosure:** Dashboard simples na superfície, detalhes sob demanda (tap)
5. **Confiança visual:** Dados precisos, sem arredondamentos enganosos, sem cores agressivas

---

## Design System

### Tailwind — Breakpoints
```css
/* Mobile (default): 320-767px — 85% dos usuários */
/* sm: 640px — tablet pequeno */
/* md: 768px — tablet */
/* lg: 1024px+ — desktop (bonus, não prioridade) */
```

### Paleta (tokens shadcn/ui)
```css
/* Primária: azul confiança ou verde financeiro */
--primary: hsl(221 83% 53%)      /* azul Nubank-ish */
--primary-foreground: hsl(0 0% 98%)

/* Categorias — consistentes em todos os gráficos */
--cat-alimentacao: #16a34a        /* verde */
--cat-delivery: #ea580c           /* laranja */
--cat-transporte: #2563eb         /* azul */
--cat-moradia: #7c3aed            /* roxo */
--cat-saude: #dc2626              /* vermelho */
--cat-lazer: #d97706              /* âmbar */
--cat-outros: #6b7280             /* cinza */
```

### Tipografia
- **Valores financeiros:** `font-mono` ou `tabular-nums` — alinhamento decimal
- **Negativos (débitos):** texto com cor destructive/vermelho
- **Positivos (créditos):** texto com cor success/verde

---

## Padrões de Componentes

### Dashboard Cards
```tsx
// Estrutura mínima de card financeiro
<Card className="p-4">
  <div className="text-sm text-muted-foreground">Total Despesas</div>
  <div className="text-2xl font-bold tabular-nums mt-1">
    {formatCurrency(amount)}
  </div>
  <div className="text-xs text-muted-foreground mt-1">
    {formatDate(period)}
  </div>
</Card>
```

### Estados obrigatórios em toda lista/dado
```tsx
// SEMPRE implementar os 3 estados:
{isLoading && <Skeleton className="h-48 w-full" />}
{error && <ErrorState message="Não foi possível carregar os dados" />}
{!isLoading && !error && data?.length === 0 && (
  <EmptyState
    icon={<Upload />}
    title="Nenhuma transação ainda"
    cta="Importar extrato"
    onAction={() => router.push('/import')}
  />
)}
{data?.length > 0 && <TransactionList data={data} />}
```

### Acessibilidade (WCAG AA)
- Tamanho mínimo de toque: `min-h-[44px]` — nunca menos em mobile
- Contraste: mínimo 4.5:1 para texto normal
- Labels em todos os inputs: nunca usar `placeholder` como substituto de `label`
- Focus visible: `focus-visible:ring-2` — não remover outline

---

## Mobile UX Patterns

### Bottom Navigation (mobile)
```tsx
// 4 tabs máximo — ícone + label curto
// Dashboard | Transações | Importar | Chat (Premium)
<nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
  <div className="flex justify-around py-2">
    {tabs.map(tab => (
      <Link href={tab.href} className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px]">
        <tab.icon className="h-5 w-5" />
        <span className="text-xs">{tab.label}</span>
      </Link>
    ))}
  </div>
</nav>
```

### Touch-friendly lists
- Item height mínimo: 56px
- Swipe actions para ações rápidas (corrigir categoria)
- Pull-to-refresh via scroll infinito

### Performance em Android de entrada
- Evitar animações pesadas (prefer `transition-opacity` vs `transform`)
- Imagens com `next/image` e lazy loading
- Gráficos: preferir CSS/SVG simples vs bibliotecas pesadas
- Bundle size: importar apenas o que usar de chart libraries

---

## Paywall Design

O paywall deve ser **não intrusivo** e mostrar valor real:
- Aparecer como modal (não bloquear navegação)
- Mostrar preview do que a IA responderia com os dados do usuário
- CTA primário: "Começar trial grátis de 7 dias"
- Preço visível: R$14,90/mês ou R$X/ano (2 meses grátis)
- Comparativo Free vs Premium em bullets simples

---

## Checklist de Review de UI

Antes de considerar um componente completo:
- [ ] Funciona em 375px sem overflow horizontal?
- [ ] Todos os estados (loading/error/empty/data) implementados?
- [ ] Valores financeiros formatados em pt-BR (R$ 1.234,56)?
- [ ] Textos, labels e mensagens de erro em PT-BR?
- [ ] Touch targets >= 44px?
- [ ] Contraste adequado (WCAG AA)?
- [ ] Testado no Chrome DevTools simulando Android?
