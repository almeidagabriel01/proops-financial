---
name: ui-ux-pro-max-financial
description: "Extensão financeira do ui-ux-pro-max para o App Financeiro Pessoal. Use quando precisar de: paletas específicas para fintech brasileiro, layouts de dashboard financeiro mobile, componentes de gráficos de gastos, design de chat IA financeiro, ou paywall de upgrade Premium. Complementa o ui-ux-pro-max com contexto específico do produto."
metadata:
  author: project
  version: "1.0.0"
---

# UI/UX Pro Max — App Financeiro Pessoal

> Este skill complementa o `ui-ux-pro-max` global com contexto específico do produto financeiro.
> Para design geral (paletas, tipografia, estilos globais), use `ui-ux-pro-max`.
> Este skill foca em **padrões específicos de fintech mobile-first brasileira**.

---

## Persona e Contexto

**Usuário:** CLT 28-38 anos, classe B/C, Android (85%), acessa via Chrome mobile
**Momento de uso:** No ônibus, no intervalo, antes de dormir — contexto de atenção fragmentada
**Objetivo ao abrir o app:** Entender rápido como estão as finanças, sem esforço

**Referências visuais:**
- Nubank: confiança, modernidade, dados claros em fundo escuro
- Cleo (UK): personalidade, tom acessível, sem jargão financeiro
- PicPay: brasileiro, familiar, mobile-first
- **Evitar:** visual bancário tradicional (Bradesco, BB) — muito formal/corporativo

---

## Telas e Padrões Específicos

### 1. Dashboard Principal

O coração do produto — deve ser impactante e glanceable:

```
┌────────────────────────┐
│  Abril 2026            │  ← mês/ano atual, navegável
│                        │
│  💚 Receitas           │
│  R$ 5.200,00           │  ← grande, destaque
│                        │
│  🔴 Despesas           │
│  R$ 3.847,23           │
│                        │
│  ═══════════════════   │
│  Saldo: R$ 1.352,77    │  ← positivo=verde, negativo=vermelho
│                        │
│  [Donut chart 180px]   │  ← distribuição por categoria
│                        │
│  Alimentação  R$820    │
│  ████████░░  31%       │
│                        │
│  Transporte   R$450    │
│  █████░░░░░  17%       │
│  ...                   │
└────────────────────────┘
```

**Decisões de design:**
- Valores sempre com `tabular-nums` para alinhamento decimal
- Positivos: `text-green-600`, Negativos: `text-red-600`
- Donut chart: 180px de diâmetro no mobile — suficiente para ser legível sem dominar a tela
- Barras de categoria: preenchimento proporcional ao maior gasto (não ao total)

### 2. Lista de Transações

```
┌────────────────────────┐
│  [Filtros rápidos]     │  ← chips: Este mês | Anterior | Customizado
│  [🔍 Buscar...]        │
│                        │
│  Hoje                  │
│  ┌──────────────────┐  │
│  │ iFood       -R$45│  │  ← ícone categoria + descrição + valor
│  │ 🛵 Delivery  12h │  │  ← categoria tag + horário
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ Uber        -R$23│  │
│  │ 🚗 Transporte 9h │  │
│  └──────────────────┘  │
│                        │
│  Ontem                 │
│  ...                   │
└────────────────────────┘
```

**Tap em transação → Bottom Sheet:**
```
┌────────────────────────┐
│  iFood                 │
│  R$ 45,00 · 05/04/2026 │
│                        │
│  Categoria: Delivery   │
│  [Mudar categoria ▾]   │
│                        │
│  Mudar todas "iFood"   │  ← batch correction
│  para: Delivery        │
│           [Confirmar]  │
└────────────────────────┘
```

### 3. Tela de Importação

```
┌────────────────────────┐
│  Importar Extrato      │
│                        │
│  ┌──────────────────┐  │
│  │                  │  │
│  │  📄              │  │
│  │  Arraste ou      │  │
│  │  toque para      │  │
│  │  selecionar      │  │
│  │                  │  │
│  │  OFX ou CSV      │  │
│  │  até 5MB         │  │
│  └──────────────────┘  │
│                        │
│  Bancos suportados:    │
│  Nubank  Itaú  Bradesco│
│  + qualquer OFX        │
└────────────────────────┘

── após upload ──

┌────────────────────────┐
│  Processando...        │
│                        │
│  ✅ Arquivo recebido   │
│  ✅ 247 transações     │
│  ⏳ Categorizando...   │
│                        │
│  [████████░░░░] 70%    │
└────────────────────────┘
```

### 4. Chat IA (Premium)

```
┌────────────────────────┐
│  Assistente Financeiro │
│                        │
│          ╭──────────╮  │
│          │quanto    │  │
│          │gastei de │  │
│          │iFood?    │  │
│          ╰──────────╯  │
│                        │
│  ╭──────────────────╮  │
│  │ Em abril você    │  │
│  │ gastou R$ 234 em │  │
│  │ Delivery (5x).   │  │
│  │ No mês anterior  │  │
│  │ foi R$ 178 (4x). │  │
│  ╰──────────────────╯  │
│                        │
│  [💬 Pergunte algo...] │
│                    [▶] │
└────────────────────────┘
```

### 5. Paywall (Upgrade Premium)

**Princípio:** Mostrar o produto, não listar features

```
┌────────────────────────┐
│  Pergunta para a IA:   │
│                        │
│  "quanto de Uber gasto │
│   por mês em média?"   │
│                        │
│  [resposta simulada    │
│   com dados reais do   │
│   usuário como preview]│
│                        │
│  ────────────────────  │
│  Desbloqueie o Premium │
│                        │
│  ✓ Chat com IA         │
│  ✓ Histórico completo  │
│  ✓ Múltiplas contas    │
│                        │
│  [Testar 7 dias grátis]│
│  R$14,90/mês depois    │
│                        │
│  [Ver planos]          │
└────────────────────────┘
```

---

## Micro-interações Importantes

- **Categorização corrigida:** feedback visual sutil (✓ verde) + não recarregar a lista
- **Import concluído:** toast com "247 transações importadas" + navigate para dashboard
- **Streaming de chat:** cursor piscante enquanto IA digita (similar ao ChatGPT)
- **Pull-to-refresh:** indicador nativo do browser, não custom

---

## Tokens de Cor por Categoria

```typescript
// src/lib/utils/constants.ts
export const CATEGORY_CONFIG = {
  alimentacao:  { color: '#16a34a', label: 'Alimentação', icon: '🛒' },
  delivery:     { color: '#ea580c', label: 'Delivery',    icon: '🛵' },
  transporte:   { color: '#2563eb', label: 'Transporte',  icon: '🚗' },
  moradia:      { color: '#7c3aed', label: 'Moradia',     icon: '🏠' },
  saude:        { color: '#dc2626', label: 'Saúde',       icon: '💊' },
  educacao:     { color: '#0891b2', label: 'Educação',    icon: '📚' },
  lazer:        { color: '#d97706', label: 'Lazer',       icon: '🎮' },
  compras:      { color: '#db2777', label: 'Compras',     icon: '🛍️' },
  assinaturas:  { color: '#9333ea', label: 'Assinaturas', icon: '📱' },
  transferencias:{ color: '#64748b', label: 'Transf.',    icon: '↔️' },
  salario:      { color: '#16a34a', label: 'Salário',     icon: '💰' },
  investimentos:{ color: '#0f766e', label: 'Investim.',   icon: '📈' },
  impostos:     { color: '#92400e', label: 'Impostos',    icon: '📋' },
  outros:       { color: '#6b7280', label: 'Outros',      icon: '📦' },
} as const
```
