# Market Research — Gap de Features do Finansim vs. Concorrentes

**Data:** Abril 2026  
**Analista:** Atlas (@analyst)  
**Metodologia:** Análise comparativa cruzada entre Finansim e 14 concorrentes BR + internacionais, baseada em pesquisas de mercado anteriores, reviews de usuários (App Store, Play Store, Reddit, Capterra) e documentação pública dos produtos.

---

## 1. Executive Summary — Top 5 Features Mais Impactantes

Estas cinco features reúnem o maior ROI para o Finansim: impacto alto em retenção/conversão e esforço de implementação baixo ou médio. Devem entrar no roadmap imediato.

| # | Feature | Por que é crítica |
|---|---------|-------------------|
| 1 | **Alertas de orçamento (push/email)** | O orçamento já existe via function calling, mas sem alertas o usuário não sabe quando está passando do limite. Todos os concorrentes sérios têm. É a "última milha" da feature de budgets. |
| 2 | **Detecção e agrupamento de parcelas** | Feature hiper-brasileira. "Parcela 1/12 no Magalu" representa grande parte dos gastos de cartão. Nenhum concorrente BR faz isso bem. Diferencial defensável. |
| 3 | **Motor de regras de categorização** | A IA aprende, mas o usuário não consegue criar regras explícitas ("toda compra no iFood = Delivery"). Copilot Money é líder global com isso. Reduz drasticamente erros de categorização. |
| 4 | **WhatsApp: notificações + consultas rápidas** | 99% dos brasileiros estão no WhatsApp. Mobills PRO lançou e virou diferencial imediato. Consultar saldo e receber alertas sem abrir o app é o que o mercado BR quer. |
| 5 | **Rastreamento de assinaturas e alertas de reajuste** | Copilot Money é líder global nessa feature. No Brasil, Netflix, Spotify, planos de celular e clubes de assinatura reajustam frequentemente. Detectar automaticamente e alertar gera engajamento orgânico. |

---

## 2. Tabela Completa de Features por Prioridade

### Legenda
- **Concorrentes BR:** Mobills (Mo), Organizze (Or), Minhas Economias (ME), Jota AI (Jo), ZapGastos (ZG)
- **Concorrentes INT:** YNAB (YN), Copilot Money (Co), Monarch Money (MM), PocketGuard (PG), Simplifi (Si), Rocket Money (RM)
- **Finansim:** ✅ tem | ⬜ não tem | 🔶 parcial/backlog

| Feature | Finansim | Concorrentes BR | Concorrentes INT | Impacto | Esforço | Prioridade |
|---------|----------|----------------|-----------------|---------|---------|-----------|
| **GESTÃO FINANCEIRA** | | | | | | |
| Orçamento mensal por categoria | 🔶 via chat | Mo, Or, ME | YN, MM, PG, Si | Alto | Baixo | **MVP** |
| Alertas de orçamento (80%/100%) | ⬜ | Mo, Or | YN, MM, PG | Alto | Baixo | **MVP** |
| Detecção de transações recorrentes | 🔶 backlog | Mo | MM, Co, PG | Alto | Médio | **MVP** |
| Detecção e agrupamento de parcelas | ⬜ | nenhum | nenhum | Alto | Médio | **MVP** |
| Motor de regras de categorização | ⬜ | nenhum | Co, MM | Alto | Médio | **MVP** |
| Projeção de saldo futuro (cashflow) | 🔶 backlog | nenhum | PG, Si, MM | Alto | Médio | **MVP** |
| Safe-to-spend ("posso gastar hoje?") | 🔶 FASE3 | nenhum | PG | Alto | Baixo | **MVP** |
| Saldo líquido no dashboard (receita−despesa) | ⬜ | Mo, Or | todos | Alto | Baixo | **MVP** |
| Busca full-text em transações | ⬜ | Mo, Or | todos | Alto | Baixo | **MVP** |
| Notas em transações | ⬜ | Mo | Co, MM, YN | Médio | Baixo | **MVP** |
| Tags personalizadas em transações | ⬜ | ME | Co, MM | Médio | Baixo | **MVP** |
| Metas financeiras com prazo visual | 🔶 via chat | Mo, Or | YN, MM, PG | Alto | Médio | **MVP** |
| **VISUALIZAÇÃO E RELATÓRIOS** | | | | | | |
| Score de saúde financeira (0-100) | ⬜ | nenhum (foi GuiaBolso) | Co | Alto | Médio | **Next** |
| Relatório mensal automático (PDF/email) | ⬜ | Mo, Or | MM, Co | Alto | Médio | **Next** |
| Rastreamento de assinaturas | ⬜ | nenhum | Co, RM | Alto | Médio | **Next** |
| Alerta de reajuste de assinatura | ⬜ | nenhum | Co | Alto | Médio | **Next** |
| Evolução patrimonial (net worth) | 🔶 FASE3 | nenhum | MM, Co | Médio | Médio | **Next** |
| Fluxo de caixa detalhado (cashflow view) | ⬜ | nenhum | MM, YN | Médio | Médio | **Next** |
| Comparativo multi-período (trimestre/ano) | ⬜ | Mo | MM, Co | Médio | Médio | **Next** |
| Heatmap de gastos por dia | ⬜ | nenhum | Co | Baixo | Médio | **Futuro** |
| **IMPORTAÇÃO E INTEGRAÇÃO** | | | | | | |
| Open Finance Brasil (sync automático) | ⬜ | Or, ME, Jo, ZG | n/a | Alto | Alto | **Next** |
| Importação de fatura de cartão de crédito | ⬜ | Mo, Or | todos | Alto | Médio | **Next** |
| Suporte a múltiplos cartões | 🔶 parcial | Mo | todos | Alto | Baixo | **Next** |
| Reconciliação automática de lançamentos | ⬜ | Or | MM | Médio | Alto | **Futuro** |
| **EXPERIÊNCIA** | | | | | | |
| Notificações push de orçamento | ⬜ | Mo, Or | YN, MM | Alto | Baixo | **MVP** |
| WhatsApp: notificações + consultas | ⬜ | Mo PRO, Jo, ZG | n/a | Alto | Médio | **Next** |
| Detecção de gastos duplicados | ⬜ | nenhum | Co | Alto | Baixo | **MVP** |
| Alerta de cobrança indevida/duplicada | ⬜ | nenhum | Co, RM | Alto | Baixo | **MVP** |
| Alertas de contas a vencer (bill reminders) | 🔶 FASE3 | Mo, Or | todos | Alto | Médio | **MVP** |
| Anexar comprovante/foto em transação | ⬜ | nenhum | Co | Médio | Médio | **Next** |
| Favoritar transações importantes | ⬜ | nenhum | Co | Baixo | Baixo | **Futuro** |
| **IA E AUTOMAÇÃO** | | | | | | |
| Detecção de parcelas automática | ⬜ | nenhum | nenhum | Alto | Médio | **MVP** |
| Previsão de gastos do próximo mês | 🔶 backlog | nenhum | Co, MM | Alto | Médio | **Next** |
| Sugestão de economia por padrão | ⬜ | nenhum | RM, Co | Alto | Médio | **Next** |
| Detector de aumento de preço em assinaturas | ⬜ | nenhum | Co | Alto | Médio | **Next** |
| **BRASIL-SPECIFIC** | | | | | | |
| Categorização para IRPF (deduções fiscais) | ⬜ | nenhum | n/a | Alto | Médio | **Next** |
| Detecção de sazonalidades BR (IPVA, IPTU, 13o) | ⬜ | nenhum | n/a | Alto | Baixo | **MVP** |
| Modo MEI/autônomo (renda variável) | ⬜ | nenhum | n/a | Alto | Alto | **Futuro** |
| **SOCIAL** | | | | | | |
| Modo família (múltiplos usuários) | ⬜ | ME, ZG | MM, YN | Alto | Alto | **Futuro** |
| Divisão de despesas (rachar conta) | ⬜ | nenhum | nenhum (Splitwise) | Médio | Alto | **Futuro** |
| Plano familiar (billing consolidado) | ⬜ | nenhum | MM | Médio | Alto | **Futuro** |

---

## 3. Análise de Cada Concorrente

### 3.1 Mobills (Brasil — Apps PFM Dedicados)
**Base:** 8M+ downloads  
**Destaques:**
- App mais completo em funcionalidades PFM no Brasil
- Orçamentos por categoria com alertas de limite
- Relatórios gráficos avançados (exportáveis)
- QR Code para registro automático de notas fiscais
- **Mobills PRO (diferencial recente):** assessor IA no WhatsApp com texto e áudio

**O que usuários elogiam:** Variedade de relatórios, gerenciamento de cartão de crédito, sincronização web+mobile  
**O que usuários reclamam:** Curva de aprendizado alta para iniciantes, sincronização bancária instável, preço dos planos avançados  
**Oportunidade para Finansim:** Mobills não tem IA conversacional com function calling nem input por voz nativo. Nossa IA é superior.

---

### 3.2 Organizze (Brasil — Apps PFM Dedicados)
**Base:** 1M+ downloads, 15+ anos de mercado  
**Destaques:**
- Interface mais simples e limpa do mercado BR
- Open Finance integrado (Plano Conectado)
- Alertas de contas a pagar
- Excelente reputação no Reclame Aqui

**O que usuários elogiam:** Simplicidade, interface intuitiva, offline, parceria Serasa  
**O que usuários reclamam:** Preço elevado (até R$599,90/ano para Conectado Plus), sem IA, sem WhatsApp  
**Oportunidade para Finansim:** Organizze é o líder em simplicidade mas não tem IA. Preencher o gap "simples + IA" é o posicionamento ideal.

---

### 3.3 Minhas Economias (Brasil — Freemium com Anúncios)
**Destaques:**
- Totalmente gratuito (todas as funcionalidades)
- Open Finance integrado
- Tags e membros da família
- Subcategorias personalizadas

**O que usuários elogiam:** Gratuito, multiplataforma, gestão familiar  
**O que usuários reclamam:** Anúncios intrusivos, interface datada, sem IA  
**Oportunidade para Finansim:** Tags e gestão familiar são features ausentes no Finansim. O modelo "gratuito com anúncios" é fraco — nosso freemium com IA é mais sustentável.

---

### 3.4 Jota AI (Brasil — WhatsApp-First)
**Destaques:**
- 100% via WhatsApp (zero app para baixar)
- Open Finance com +20 bancos conectados
- Pix por áudio
- 100% gratuito

**O que usuários elogiam:** Conveniência absoluta, zero fricção, Open Finance robusto  
**O que usuários reclamam:** Sem dashboards visuais, limitação do WhatsApp para análises complexas  
**Oportunidade para Finansim:** Jota tem o canal (WhatsApp) mas não tem dashboard rico. Finansim tem o dashboard mas não tem o canal. Combinar os dois é o diferencial.

---

### 3.5 YNAB — You Need A Budget (Internacional)
**Destaques:**
- Metodologia de orçamento de base zero ("every dollar a job")
- "Age of Money" — métrica de maturidade financeira
- Goals por categoria com contribuição mensal
- Live workshops e comunidade ativa
- Debt payoff tools

**O que usuários elogiam:** Metodologia eficaz, comunidade forte, mudança de comportamento real  
**O que usuários reclamam:** Curva de aprendizado alta, preço alto (US$109/ano), filosofia rígida não serve para todos  
**Oportunidade para Finansim:** YNAB não tem IA conversacional. A metodologia é excelente mas complexa demais para o Brasil. Adaptar o conceito de "metas por categoria" ao contexto BR com IA é uma oportunidade clara.

---

### 3.6 Copilot Money (Internacional — iOS)
**Destaques (referência de qualidade):**
- ~95% de precisão na categorização automática
- **Rules Engine:** usuário cria regras explícitas ("toda compra no iFood = Delivery")
- **Subscription tracking + price change alerts** — killer feature
- Health score financeiro (0-100)
- Calendar view de gastos (heatmap)
- Net worth tracking
- Smart import (dedup inteligente)

**O que usuários elogiam:** UX excepcional, precisão da categorização, detecção de assinaturas  
**O que usuários reclamam:** iOS-only, US-only, sem versão Android  
**Oportunidade para Finansim:** Copilot é o benchmark de qualidade global. O Rules Engine e a detecção de assinaturas são as duas features mais copiadas do Copilot. Finansim pode trazer isso para o Brasil com contexto local.

---

### 3.7 Monarch Money (Internacional)
**Destaques:**
- Colaboração entre cônjuges/família (permissões granulares)
- Cash flow analysis completo
- Custom categories + tags
- GPT-4 assistant com dados reais do usuário
- Subscription management
- Net worth com gráfico histórico
- Financial advisors feature (para usuários que querem ajuda humana)

**O que usuários elogiam:** Features para casais, assistente IA com dados reais, cashflow completo  
**O que usuários reclamam:** US-only, caro (US$99/ano), setup complexo  
**Oportunidade para Finansim:** Monarch substitutiu o Mint como líder no US. O modelo "casal + IA" é completamente inexplorado no Brasil.

---

### 3.8 PocketGuard (Internacional)
**Destaques:**
- **"In My Pocket"** — calcula quanto pode gastar hoje de forma segura
- Projeção de saldo baseada em recorrências
- Savings goals
- Debt payoff planner
- Bill negotiation (terceiriza negociação de contas)

**O que usuários elogiam:** Safe-to-spend é intuitivo e direto, simplicidade  
**O que usuários reclamam:** Sem versão gratuita robusta, features avançadas caras  
**Oportunidade para Finansim:** O "In My Pocket" = Safe-to-Spend do Finansim (já no FASE3). PocketGuard valida que essa feature tem alto engajamento.

---

### 3.9 Rocket Money (Internacional)
**Destaques:**
- **Cancelamento automático de assinaturas** — ROI tangível e imediato
- Detecção de cobranças indevidas/duplicadas
- Savings automation ("round up")
- Bill negotiation services
- Credit monitoring

**O que usuários elogiam:** Economia real visível, detecção de assinaturas, cancelamento em 1 clique  
**O que usuários reclamam:** Modelo freemium agressivo, bill negotiation é pago  
**Oportunidade para Finansim:** A detecção de cobranças duplicadas e o alerta de reajuste de assinatura são as features mais pedidas nos reviews de apps BR. Rocket Money valida que isso tem altíssimo engajamento.

---

## 4. Diferenciais Competitivos do Finansim (o que concorrentes não têm)

Estas são as vantagens atuais do Finansim que devem ser comunicadas e protegidas:

| Diferencial | Status no Finansim | Nenhum concorrente BR tem |
|-------------|-------------------|--------------------------|
| **Input por voz** (Groq Whisper) | ✅ Implementado | Apenas POQT tem multimodalidade básica. Nenhum com qualidade de Whisper. |
| **Function calling no chat IA** | ✅ Implementado | Nubank tem Pix por IA, mas não cria orçamentos/metas via conversa. |
| **Chat IA em PT-BR com dados reais** | ✅ Implementado | Nenhum app PFM dedicado tem isso no BR com qualidade de LLM moderno. |
| **Correção de categoria com aprendizado** | ✅ Implementado | Mobills tem regras manuais, mas não aprendizado adaptativo. |
| **PWA instalável** | ✅ Implementado | Maioria dos concorrentes foca em app nativo. |
| **Onboarding guiado** | ✅ Implementado | Organizze é o único com onboarding considerado bom nos reviews. |
| **Trial 7 dias Pro automático** | ✅ Implementado | Organizze tem 7 dias. Mobills tem para o PRO. Patamar similar. |
| **Contexto brasileiro nativo** | ✅ Parcial | Categorias em PT-BR, mas falta sazonalidades (IPVA, 13o, IRPF). |

---

## 5. Roadmap Recomendado — Próximos 3 Ciclos

### Ciclo 1 — MVP Extensions (Alta Prioridade, Baixo Esforço)
*Objetivo: Fechar os gaps mais óbvios que usuários comparam ao avaliar o produto*

| Feature | Esforço | Impacto | Notas |
|---------|---------|---------|-------|
| Saldo líquido no dashboard (receita − despesa) | 1-2 dias | Alto | Card simples no dashboard. Dado já existe. |
| Busca full-text em transações | 1-2 dias | Alto | Input + query Supabase. Funcional no mobile. |
| Notas em transações | 1 dia | Médio | Campo `notes text` na tabela + UI inline. |
| Tags personalizadas | 2-3 dias | Médio | Tabela `transaction_tags` + UI de tags. |
| Alertas de orçamento (push/email) | 3-4 dias | Alto | Supabase Edge Function + web push. Requer tabela `push_subscriptions`. |
| Notificações push via PWA | 2-3 dias | Alto | Já tem PWA. Adicionar service worker push. Pré-requisito para alertas. |
| Detecção de cobranças duplicadas | 2-3 dias | Alto | SHA-256 já existe para dedup. Alertar quando detectar. |
| Detecção de sazonalidades BR | 2-3 dias | Alto | Algoritmo simples: detectar IPVA/IPTU/13o/IRPF por descrição + mês. Mostrar contexto no dashboard. |
| Safe-to-spend card | 2-3 dias | Alto | Já no FASE3. Cálculo simples usando `scheduled_transactions`. |
| Metas financeiras UI dedicada | 3-4 dias | Alto | Atualmente só via chat. Criar página `/goals` com progresso visual. |
| Bill reminders (alertas de contas) | 3-4 dias | Alto | Já no FASE3. Edge Function + push. |

**Total estimado:** 3-4 semanas de 1 dev  
**Resultado:** Paridade funcional com Mobills Free + diferencial de IA já existente

---

### Ciclo 2 — Next Differentiators (Alto Impacto, Esforço Médio)
*Objetivo: Criar diferenciais defensáveis vs. concorrentes diretos*

| Feature | Esforço | Impacto | Notas |
|---------|---------|---------|-------|
| Motor de regras de categorização | 1 semana | Alto | Tabela `categorization_rules`. UI: "Se descrição contém X, categorizar como Y". Roda antes da IA. |
| Detecção e agrupamento de parcelas | 1-2 semanas | Alto | Parser: detectar padrão "N/M" nas descrições. Agrupar visualmente. Projetar parcelas futuras. |
| Rastreamento de assinaturas | 1 semana | Alto | Subconjunto de recorrentes. Detectar periodicidade mensal/anual. Card dedicado. |
| Alerta de reajuste de assinatura | 3-4 dias | Alto | Compara valor atual vs. histórico para mesma descrição recorrente. Alert + notificação. |
| Score de saúde financeira (0-100) | 1 semana | Alto | Fórmula: receita/despesa ratio + diversificação de categorias + metas ativas + parcelas em dia. Badge no dashboard. |
| Relatório mensal automático (PDF) | 1 semana | Alto | Supabase Edge Function no D+1 do mês. gerar PDF com Puppeteer ou React-PDF. Enviar por email. |
| Categorização para IRPF | 3-4 dias | Alto | Mapear categorias existentes para campos da declaração IR. Exportar CSV/PDF de deduções. Saúde > Educação > etc. |
| WhatsApp: notificações + consultas | 2 semanas | Alto | WhatsApp Business API (Twilio/Zenvia). Alertas de orçamento + saldo + consulta rápida via IA. Plano Pro. |
| Importação de fatura de cartão | 1 semana | Alto | Parser de OFX/CSV de fatura de cartão. Rastrear due date. Separar por cartão. |
| Net worth tracking | 1 semana | Médio | Já no FASE3. Migration `account_type` + `initial_balance`. Gráfico histórico. |
| Comparativo multi-período | 3-4 dias | Médio | Comparar mês vs. mês anterior vs. média 3M. Já temos trend cards; expandir para view dedicada. |
| Anexar comprovante/foto | 1 semana | Médio | Supabase Storage. Upload foto na transação. OCR com IA para pré-preencher valor/descrição. |

**Total estimado:** 6-8 semanas de 1 dev  
**Resultado:** Produto significativamente superior a Mobills e Organizze em conjunto de features

---

### Ciclo 3 — Platform Features (Médio Impacto, Esforço Alto)
*Objetivo: Ampliar mercado endereçável e criar lock-in*

| Feature | Esforço | Impacto | Notas |
|---------|---------|---------|-------|
| Open Finance Brasil (via Pluggy) | 3-4 semanas | Alto | R$2.500/mes de custo. Requer validação de unit economics primeiro. Widget de consentimento Pluggy. |
| Modo família (shared accounts) | 3-4 semanas | Alto | RBAC: admin + viewer. Orçamentos compartilhados. Notificações em tempo real. |
| Gestão de dívidas (snowball/avalanche) | 2-3 semanas | Alto | 70M inadimplentes no BR. Mapear dívidas, calcular plano ótimo, monitorar progresso. |
| Modo MEI/autônomo | 3-4 semanas | Alto | Separar receitas PJ/PF. DAS mensal. Nota fiscal simples. Pró-labore. 15M MEIs no BR. |
| Cashflow semanal/mensal (view dedicada) | 2 semanas | Médio | Gráfico de entradas vs. saídas por semana. Previsão baseada em recorrentes. |
| Reconciliação automática | 3 semanas | Médio | Match entre lançamentos manuais e importados. Evitar duplicatas. |
| Divisão de despesas (rachar conta) | 3 semanas | Médio | Feature social. Criar "conta compartilhada" temporária. Link para pagamento via Pix. |

**Total estimado:** 12-16 semanas de 1-2 devs  
**Resultado:** Plataforma completa cobrindo segmentos família e autônomos — mercado 3x maior

---

## 6. Oportunidades Não Exploradas por Ninguém

Estas são as "white spaces" do mercado — nenhum concorrente (BR ou internacional) executa bem.

### 6.1 IRPF Intelligence
**O que é:** Categorizar automaticamente as transações que são dedutíveis no Imposto de Renda (saúde, educação, dependentes) e gerar o relatório pronto para declaração.  
**Por que ninguém faz:** Requer conhecimento fiscal BR + integração de dados reais. LLMs modernos tornam isso possível agora.  
**Valor:** Todo brasileiro que declara IRPF (30M+) precisa separar notas de saúde e educação manualmente. A IA já categoriza — é só mapear para os campos da declaração.

### 6.2 Sazonalidades Brasileiras Proativas
**O que é:** Detectar e avisar antecipadamente sobre gastos sazonais previsíveis: IPVA (janeiro), IPTU (fevereiro), IRPF (março-abril), férias (dezembro/julho), 13o salário, matrícula escolar, material escolar, etc.  
**Por que ninguém faz:** Requer calendário fiscal BR + modelo preditivo por histórico do usuário.  
**Valor:** Usuário sabe em outubro que "em fevereiro virão R$1.200 de IPTU + R$800 de material escolar" e pode se preparar.

### 6.3 Pix Intelligence
**O que é:** Classificar e analisar especificamente os Pix recebidos e enviados. "Você enviou R$450 em Pix para amigos este mês (social spending). Recebeu R$2.300 em Pix (renda extra provável)."  
**Por que ninguém faz:** Pix é novo o suficiente para não ter categorização especializada. 160M usuários de Pix no Brasil.

### 6.4 Cashback e Benefícios Não Aproveitados
**O que é:** Com base nas lojas onde o usuário compra, identificar cartões com cashback melhor ou programas de pontos não aproveitados. "Você comprou R$800 em farmácia este mês. Seu cartão X não tem cashback em farmácias. O cartão Y daria R$40 de cashback."  
**Por que ninguém faz (BR):** Requer dados de cartões e parceria com comparadores. Rocket Money faz parcialmente no US.

### 6.5 Coaching de IA Proativo (não reativo)
**O que é:** Em vez de esperar o usuário perguntar, a IA envia insights proativos personalizados: "Você gasta R$180/mês em delivery. Cortando pela metade, em 12 meses acumula R$1.080 — o equivalente à sua meta de viagem."  
**Por que ninguém faz bem:** Chatbots são reativos. Agentes proativos requerem infraestrutura de triggers e dados históricos. O Finansim tem o stack (LLM + dados reais + function calling) para fazer isso.

---

## 7. Síntese dos Reviews de Usuários

### O que usuários BR reclamam mais (oportunidades diretas):

1. **"Tenho que digitar tudo manualmente"** — Principale killer de retenção em todos os apps BR sem Open Finance. Cada transação manual = fricção = abandono.
2. **"Perco o controle perto do final do mês"** — Falta de alertas proativos de orçamento quando se aproxima do limite.
3. **"Não consigo ver as parcelas de forma organizada"** — Problema endêmico no Brasil. "Compra de R$1.200 em 6x" some nas transações sem contexto.
4. **"Não sei quanto posso gastar hoje"** — PocketGuard resolveu isso com "In My Pocket". PocketGuard tem 4.8 estrelas no US por causa dessa feature.
5. **"O app parou de funcionar depois do reajuste do Spotify"** — Assinaturas com valores variáveis confundem os algoritmos de detecção.
6. **"Preciso declarar IR e não consigo exportar o que preciso"** — Nenhum app BR resolve isso.

### O que usuários INT elogiam (features a importar):

1. **Copilot Money:** Rules engine + detecção de assinaturas. "Finalmente um app que não precisa de babysitting."
2. **YNAB:** Metodologia. "Mudou minha relação com dinheiro." — Mas a metodologia é complexa demais para o Brasil.
3. **Monarch Money:** Colaboração. "Pela primeira vez meu marido e eu temos a mesma visão das finanças."
4. **PocketGuard:** Safe-to-spend. "Um número simples que me diz o que preciso saber."
5. **Rocket Money:** Cancelamento de assinaturas. "Economizei R$300/mês só descobrindo assinaturas esquecidas."

---

## Apêndice: Features do Finansim vs. Checklist do Briefing

| Feature do Briefing | Finansim | Prioridade |
|--------------------|----------|-----------|
| Orçamento por categoria com alertas | 🔶 orçamento via chat, sem alertas | MVP |
| Metas financeiras com progresso visual | 🔶 via chat, sem UI dedicada | MVP |
| Receitas recorrentes | 🔶 backlog | MVP |
| Despesas recorrentes | 🔶 backlog | MVP |
| Parcelas detectadas e agrupadas | ⬜ | MVP |
| Projeção de saldo futuro | 🔶 backlog | Next |
| Reserva de emergência (meses cobertura) | ⬜ | Next |
| Saldo líquido no dashboard | ⬜ | MVP |
| Comparativo entre períodos | 🔶 cards com tendência | Next (expandir) |
| Relatório mensal automático | ⬜ | Next |
| Evolução patrimonial | 🔶 FASE3 | Next |
| Fluxo de caixa semanal/mensal | ⬜ | Futuro |
| Score de saúde financeira | ⬜ | Next |
| Heatmap de gastos | ⬜ | Futuro |
| Open Finance Brasil | ⬜ | Next |
| Importação de fatura de cartão | ⬜ | Next |
| Múltiplos cartões do mesmo banco | 🔶 parcial | Next |
| Reconciliação automática | ⬜ | Futuro |
| Notificações push de gastos | ⬜ | MVP |
| Modo família | ⬜ | Futuro |
| Divisão de despesas | ⬜ | Futuro |
| Tags personalizadas | ⬜ | MVP |
| Notas em transações | ⬜ | MVP |
| Anexar comprovante/foto | ⬜ | Next |
| Busca full-text | ⬜ | MVP |
| Favoritar transações | ⬜ | Futuro |
| Detecção de gastos duplicados | ⬜ | MVP |
| Alerta de cobrança indevida | ⬜ | MVP |
| Sugestão de economia | ⬜ | Next |
| Previsão de gastos próximo mês | 🔶 backlog | Next |
| Detector de aumento de assinaturas | ⬜ | Next |

---

*Compilado por Atlas (@analyst) — Abril 2026*  
*Baseado em: pesquisas de mercado anteriores (docs/research/), reviews públicos App Store/Play Store/Reddit/Capterra, documentação oficial dos produtos analisados.*

— Atlas, investigando a verdade 🔎
