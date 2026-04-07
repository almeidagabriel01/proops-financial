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

## Tech Debt — usage_count no category_dictionary

**Prioridade:** Baixa
**Epic sugerido:** Epic 2 ext. (pós-MVP)
**Origem:** Story 2.2 m2 (QA Review 2026-04-07)
**Descrição:** `saveCorrection()` sempre envia `usage_count: 1` no upsert do `category_dictionary`. O Supabase JS substitui o campo no conflito em vez de incrementar. O AC3 da Story 2.2 especifica `usage_count=usage_count+1`.

**Fix necessário:** Criar RPC `increment_category_usage(user_id, description_pattern, category)` que execute o UPDATE com `usage_count = usage_count + 1` no banco e chamá-la em substituição ao upsert direto, ou executar o incremento via SQL raw.

**Impacto atual:** Baixo — a contagem de uso não é exibida para o usuário nem influencia decisões de categorização no MVP. O dicionário funciona corretamente para lookup (Tier 1); apenas o contador fica incorreto.

---

*Última atualização: 2026-04-07*
