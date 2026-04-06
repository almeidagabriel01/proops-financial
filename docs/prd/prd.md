# Product Requirements Document (PRD)

**Produto:** App Financeiro Pessoal com IA — Brasil
**Versao:** 1.4
**Data:** 2026-04-06
**Autor:** Morgan (@pm)
**Status:** Approved

---

## 1. Goals and Background Context

### 1.1 Goals

- Dar visibilidade financeira total ao usuario sem exigir esforco manual
- Eliminar a "fadiga de input" que mata a retencao em apps concorrentes
- Criar o primeiro assistente financeiro conversacional em PT-BR com dados reais do usuario
- Validar product-market fit com MVP enxuto em 3-4 meses
- Construir base para futuras integracoes (Open Finance, WhatsApp) com receita propria

### 1.2 Background Context

No Brasil, 79% da populacao usa app bancario, mas a penetracao de apps dedicados de gestao financeira pessoal e de apenas 15-25%. A razao principal nao e falta de interesse — e que as solucoes existentes exigem disciplina de input que ninguem mantem. Planilhas sao abandonadas na segunda semana. Apps como Organizze e Mobills requerem categorizacao manual. Extratos bancarios listam transacoes sem contexto.

A oportunidade esta na intersecao de tres tendencias: IA generativa capaz de categorizar e conversar em portugues natural, o habito brasileiro de consumir servicos financeiros pelo celular, e um mercado de 70M+ de inadimplentes que nunca tiveram uma ferramenta que trabalhasse *por eles*. O MVP valida essa tese com custo minimo, usando importacao OFX/CSV em vez de APIs de Open Finance, e Claude API como motor de IA.

### 1.3 Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-05 | 1.0 | PRD inicial criado com base na pesquisa de mercado e elicitacao de produto | Morgan (@pm) |
| 2026-04-05 | 1.1 | PRD aprovado. Trial 7 dias incluido, gateway Asaas confirmado (stack posteriormente retificada na v1.2) | Morgan (@pm) |
| 2026-04-05 | 1.2 | Stack retificada: Next.js web mobile-first (substitui React Native), Supabase (substitui Railway), removido App Store/Play Store do MVP | Morgan (@pm) |
| 2026-04-05 | 1.3 | QA review fixes: story 1.1 monorepo→projeto, dedup CSV via SHA-256, 14 categorias, email→msg in-app, check server-side Premium, constraints renumerados | Quinn (@qa) |
| 2026-04-06 | 1.4 | Revisao completa do modelo de planos: Free/Premium substituido por Basic (R$19,90/mes) e Pro (R$49,90/mes). Adicionados: chat Basic com Haiku (50 perguntas/mes), chat Pro com Sonnet + function calling (200 perguntas/mes), entrada por audio Pro via Whisper, secao de Function Calling na arquitetura, impacto no schema (audio_enabled), WhatsApp documentado como roadmap futuro, sem plano gratuito permanente | Morgan (@pm) |

---

## 2. Requirements

### 2.1 Functional Requirements

**Importacao e Dados:**

- **FR1:** O sistema deve permitir importacao de extratos bancarios nos formatos OFX e CSV
- **FR2:** O sistema deve fazer parsing automatico dos arquivos importados, extraindo data, valor, descricao e tipo de transacao (debito/credito)
- **FR3:** O sistema deve suportar importacao de ate 3 contas bancarias (Basic) ou contas ilimitadas (Pro); tentativa de adicionar a 4a conta no Basic deve ser bloqueada com mensagem clara de upgrade
- **FR4:** O sistema deve detectar e ignorar transacoes duplicadas ao importar um novo extrato
- **FR5:** O sistema deve armazenar historico completo de transacoes importadas — historico ilimitado em ambos os planos pagos (Basic e Pro)

**Categorizacao com IA:**

- **FR6:** O sistema deve categorizar automaticamente 100% das transacoes importadas usando IA, sem input do usuario
- **FR7:** As categorias devem refletir o contexto brasileiro (ex: iFood = Delivery, Uber = Transporte, Droga Raia = Saude)
- **FR8:** O usuario deve poder corrigir uma categorizacao, e o sistema deve aprender com a correcao para transacoes futuras
- **FR9:** O sistema deve manter um dicionario de categorizacao que melhora com o uso (aprendizado por usuario)

**Dashboard e Visualizacao:**

- **FR10:** O sistema deve exibir dashboard com visao consolidada dos gastos do mes atual, organizado por categoria
- **FR11:** O dashboard deve incluir: total de receitas, total de despesas, saldo do periodo, e distribuicao por categoria (grafico)
- **FR12:** O dashboard deve ser visualmente impactante e completo mesmo no plano gratuito — nao e uma versao degradada
- **FR13:** O sistema deve exibir lista de transacoes com filtros por categoria, periodo e valor
- **FR14:** O sistema deve mostrar comparativo mes-a-mes de gastos por categoria (Basic e Pro)

**IA Conversacional:**

- **FR15:** O sistema deve oferecer interface de chat em ambos os planos pagos, com capacidades diferenciadas por plano:
  - **Basic (Claude Haiku):** consultas sobre dados financeiros — "quanto gastei com X?", "qual meu saldo?", "analise meus gastos de marco" — sem acoes na plataforma
  - **Pro (Claude Sonnet):** consultas identicas ao Basic, mais acoes via function calling: criar transacao, recategorizar transacao, criar/ajustar orcamento por categoria, criar objetivo financeiro com meta e prazo, excluir transacao
- **FR16:** A IA deve responder consultas como: "quanto gastei com alimentacao esse mes?", "qual foi meu maior gasto em marco?", "quanto gasto de Uber por mes em media?" — em ambos os planos (Basic e Pro)
- **FR17:** A IA deve basear respostas exclusivamente nos dados reais importados pelo usuario — nunca inventar dados
- **FR18:** A IA deve responder em portugues brasileiro natural, com tom acessivel e sem jargao financeiro
- **FR19:** O sistema deve controlar custo de IA por usuario (rate limiting, caching de respostas similares):
  - Basic: 50 perguntas/mes (Claude Haiku)
  - Pro: 200 perguntas/mes (Claude Sonnet)
  - Verificacao server-side obrigatoria em toda chamada de chat — nunca confiar apenas no frontend

**Autenticacao e Conta:**

- **FR20:** O sistema deve permitir cadastro via email/senha e login social (Google) usando Supabase Auth
- **FR21:** O sistema deve utilizar Supabase Auth para gerenciamento de sessoes, JWT e refresh tokens
- **FR22:** O sistema deve gerenciar planos do usuario (Basic / Pro) com controle de acesso por feature; sem plano gratuito permanente — trial de 7 dias no Pro ativado automaticamente no cadastro

**Assinatura e Pagamento:**

- **FR23:** O sistema deve oferecer plano **Basic** (R$19,90/mes | R$191,00/ano) com: ate 3 contas bancarias, historico ilimitado, categorizacao IA, dashboard e relatorios basicos, comparativo mes a mes, chat IA consultas 50 perguntas/mes (Haiku)
- **FR24:** O sistema deve oferecer plano **Pro** (R$49,90/mes | R$479,00/ano) com: contas ilimitadas, historico ilimitado, categorizacao IA, dashboard e relatorios avancados, comparativo mes a mes, chat IA consultas + acoes 200 perguntas/mes (Sonnet), entrada por audio via Whisper
- **FR25:** O sistema deve integrar gateway de pagamento (Asaas) para processar assinaturas recorrentes (cartao, boleto, Pix) com planos mensal e anual

**Entrada por Audio (Pro):**

- **FR26:** O sistema deve aceitar entrada por audio no chat (apenas Pro): usuario grava mensagem de voz → sistema transcreve via Whisper API (OpenAI) → texto transcrito entra no fluxo normal de chat IA; custo estimado ~R$0,01/minuto de audio
- **FR27:** Usuarios Basic que tentem usar audio devem ver bloqueio claro com CTA de upgrade para Pro

**Function Calling — Acoes via Chat (Pro):**

- **FR28:** No plano Pro, a IA deve poder executar acoes na plataforma via function calling alem de responder consultas; funcoes disponiveis exclusivamente Pro:
  - `create_transaction` — criar receita ou despesa manualmente
  - `update_transaction_category` — categorizar ou recategorizar transacao
  - `delete_transaction` — excluir transacao
  - `create_budget` — criar ou ajustar orcamento por categoria
  - `create_goal` — criar objetivo financeiro com meta e prazo
- **FR29:** Usuarios Basic que tentem usar acoes via chat devem ver resposta explicando que e funcionalidade Pro, com CTA de upgrade

### 2.2 Non-Functional Requirements

**Performance:**

- **NFR1:** O parsing e categorizacao de um extrato de ate 500 transacoes deve completar em menos de 30 segundos
- **NFR2:** O dashboard deve carregar em menos de 2 segundos apos login
- **NFR3:** A resposta da IA conversacional deve iniciar (streaming) em menos de 3 segundos

**Seguranca:**

- **NFR4:** Todos os dados financeiros devem ser armazenados criptografados at-rest (AES-256)
- **NFR5:** Comunicacao deve usar HTTPS/TLS 1.3 exclusivamente
- **NFR6:** O sistema deve estar em conformidade com LGPD: consentimento explicito, direito de exclusao, politica de privacidade
- **NFR7:** Dados financeiros do usuario nunca devem ser compartilhados com terceiros

**Infraestrutura:**

- **NFR8:** Frontend Next.js hospedado na Vercel (web mobile-first)
- **NFR9:** Backend via Next.js API Routes e/ou Supabase Edge Functions
- **NFR10:** Banco de dados PostgreSQL gerenciado pelo Supabase (inclui Auth, Storage e Realtime)
- **NFR11:** IA via Claude API da Anthropic com controle de custo por usuario
- **NFR12:** Custo de infraestrutura deve se manter abaixo de US$50/mes ate 1.000 usuarios (Supabase free tier + Vercel free tier cobrem o MVP inicial)

**Qualidade:**

- **NFR13:** Cobertura de testes unitarios minima de 80% no backend
- **NFR14:** Web app deve funcionar nos navegadores modernos mobile (Chrome Android, Safari iOS) com experiencia otimizada para telas de smartphone
- **NFR15:** Interface web responsiva otimizada primariamente para mobile (mobile-first CSS), com suporte a desktop como bonus
- **NFR16:** Tempo de onboarding (cadastro ate primeiro dashboard) deve ser inferior a 5 minutos

**Escalabilidade:**

- **NFR17:** Arquitetura deve suportar adicao futura de Open Finance API sem reescrita do core
- **NFR18:** Arquitetura deve suportar adicao futura de canal WhatsApp sem reescrita do core
- **NFR19:** Sistema de categorizacao deve ser extensivel para novos bancos e formatos de extrato

---

## 3. User Interface Design Goals

### 3.1 Overall UX Vision

Interface limpa, moderna e mobile-first que transmite confianca e clareza. O usuario deve abrir o app e entender sua situacao financeira em 3 segundos. Inspiracao visual nos melhores apps de fintech brasileiros (Nubank, PicPay) — nao em planilhas.

O dashboard e o coracao do produto. Deve ser bonito o suficiente para o usuario querer abrir todo dia, e informativo o suficiente para ele nao precisar de mais nada.

### 3.2 Key Interaction Paradigms

- **Zero-input first:** O app trabalha pelo usuario. Importou o extrato? Tudo ja esta organizado
- **Glanceable:** Informacao principal visivel sem scroll ou taps
- **Progressive disclosure:** Dashboard simples na superficie, detalhes sob demanda
- **Conversational:** Chat com IA como forma natural de explorar dados (Premium)

### 3.3 Core Screens and Views

1. **Onboarding / Login** — Cadastro rapido (email/Google), primeira importacao guiada
2. **Dashboard Principal** — Visao do mes: receitas, despesas, saldo, grafico de categorias
3. **Lista de Transacoes** — Todas as transacoes com filtros e busca, categorizacao visivel
4. **Importacao de Extrato** — Upload de OFX/CSV com feedback visual do processamento
5. **Chat IA** — Interface conversacional para consultas em linguagem natural (Premium)
6. **Perfil / Configuracoes** — Conta, plano, preferencias, categorias customizadas
7. **Paywall / Upgrade** — Apresentacao do Premium com demonstracao do valor

### 3.4 Accessibility

WCAG AA — Contraste adequado, tamanhos de toque minimos, labels em formularios. Acessibilidade basica que nao exclua usuarios mas sem investimento pesado em WCAG AAA no MVP.

### 3.5 Branding

A definir. Para o MVP, usar design system limpo com paleta que transmita confianca financeira (tons de azul/verde escuro). Evitar tons agressivos ou gamificados. O app deve parecer serio mas acessivel — nao um banco corporativo, nem um app infantil.

### 3.6 Target Devices and Platforms

**Web mobile-first.** Next.js com design otimizado para navegadores mobile (Chrome Android, Safari iOS). Sem publicacao em App Store ou Play Store no MVP — acesso via browser. PWA opcional para experiencia mais nativa (icone na home screen, splash screen). 85% dos usuarios brasileiros estao em Android — otimizar para dispositivos de entrada (telas menores, hardware limitado). Desktop funciona mas nao e a prioridade.

---

## 4. Technical Assumptions

### 4.1 Repository Structure

**Single project (Next.js fullstack)** — Frontend e API routes no mesmo projeto Next.js. Supabase como backend-as-a-service externo. Sem necessidade de monorepo com workspaces separados — Next.js ja unifica frontend e backend. Simplifica desenvolvimento solo e deploy (single Vercel project).

### 4.2 Service Architecture

**Next.js fullstack + Supabase** — Next.js API Routes para logica de negocio (import, categorization, chat, billing) com Supabase como backend-as-a-service (auth, banco, storage, realtime). Modulos bem separados por dominio. Adequado para equipe de 1 pessoa e MVP. Supabase Edge Functions como alternativa para processamento assincrono quando necessario.

### 4.3 Testing Requirements

**Unit + Integration** — Testes unitarios para logica de negocio (parsing, categorizacao, queries). Testes de integracao para fluxos criticos (importacao end-to-end, chat com IA). E2E manual no MVP, automatizado na v2.

### 4.4 Additional Technical Assumptions

- **Frontend:** Next.js com TypeScript, web mobile-first. PWA opcional para experiencia mais nativa
- **Backend:** Next.js API Routes para logica de negocio. Supabase Edge Functions para processamento assincrono quando necessario
- **Banco de dados:** PostgreSQL gerenciado pelo Supabase. Schema deve suportar multi-tenancy por usuario. RLS (Row Level Security) do Supabase para isolamento de dados
- **Autenticacao:** Supabase Auth (ja inclui email/senha, Google OAuth, JWT, refresh tokens, session management)
- **Storage:** Supabase Storage para arquivos OFX/CSV enviados pelos usuarios
- **IA — Modelos por plano:**
  - Categorizacao batch (todos os planos): Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — custo otimizado
  - Chat Basic: Claude Haiku 4.5 — consultas simples, 50 perguntas/mes
  - Chat Pro: Claude Sonnet 4.6 (`claude-sonnet-4-6`) — consultas + function calling, 200 perguntas/mes
  - Audio Pro: Whisper API (OpenAI) para transcricao antes de passar ao Sonnet
- **Pagamentos:** Asaas como gateway (brasileiro, suporta cartao/boleto/Pix, custo menor no estagio inicial). Stripe para futura internacionalizacao
- **OFX Parser:** Biblioteca existente para parsing de OFX (ex: ofx-js). CSV parser customizado com deteccao de formato por banco
- **Controle de custo IA:** Rate limiting por usuario (Basic: 50/mes Haiku; Pro: 200/mes Sonnet), caching de respostas para queries identicas, verificacao server-side em cada chamada
- **Schema de planos:** `profiles.plan = 'basic' | 'pro'` (sem 'free'); `profiles.audio_enabled = boolean` (true apenas Pro, derivado do plano mas materializado para performance); `profiles.trial_ends_at` mantido
- **Logging e monitoramento:** Desde o Epic 1 — nao como feature final. Sentry para erros, logs estruturados
- **Preparacao para Open Finance:** Camada de abstracao no data layer (DataSource interface) que hoje usa OFX/CSV e amanha usa API de agregador sem mudar o resto do sistema
- **WhatsApp — Roadmap Futuro:** Canal WhatsApp mapeado para apos MVP. Channel abstraction (Channel interface) ja planejada na arquitetura — hoje a web app e o unico canal, amanha WhatsApp pode ser adicionado reutilizando toda a logica de negocio (chat, function calling, contexto financeiro) sem reescrita. Nao implementar no MVP

### 4.5 IA Architecture — Function Calling & Audio (Pro)

**Function Calling (Pro only)**

O chat Pro usa Claude Sonnet com function calling nativo. A IA decide quando executar uma acao baseada no que o usuario pediu em linguagem natural.

Funcoes disponiveis (todas exclusivas Pro):

| Funcao | Descricao | Verificacao |
|--------|-----------|-------------|
| `create_transaction` | Cria receita ou despesa manualmente | Plan = Pro, server-side |
| `update_transaction_category` | Categoriza ou recategoriza transacao existente | Plan = Pro, server-side |
| `delete_transaction` | Exclui transacao (com confirmacao) | Plan = Pro, server-side |
| `create_budget` | Cria ou ajusta orcamento mensal por categoria | Plan = Pro, server-side |
| `create_goal` | Cria objetivo financeiro com meta e prazo | Plan = Pro, server-side |

Regras de implementacao:
- Verificacao de plano na API route antes de incluir funcoes no payload do Sonnet — usuarios Basic nunca recebem function definitions
- Confirmacao explicita do usuario antes de acoes destrutivas (`delete_transaction`)
- Todas as acoes executadas com `SUPABASE_SERVICE_ROLE_KEY` server-side — RLS do usuario aplicado via `user_id` na query
- Resposta ao usuario confirmando a acao executada (ex: "Transacao de R$150,00 em Alimentacao criada com sucesso")

**Audio Input (Pro only)**

Fluxo de audio → chat:
1. Usuario grava mensagem de voz no frontend (Web Audio API / MediaRecorder)
2. Audio enviado para API route `/api/chat` com `Content-Type: multipart/form-data`
3. API route transcreve via **Whisper API** (OpenAI): `POST /v1/audio/transcriptions`
4. Texto transcrito entra no fluxo normal de chat Pro (Sonnet + function calling)
5. Custo estimado Whisper: ~$0.006/minuto ≈ R$0,01/minuto ao cambio atual

Verificacoes de plano:
- `profiles.audio_enabled = true` verificado server-side antes de aceitar audio
- Usuarios Basic recebem erro `403` com mensagem de upgrade se tentarem enviar audio
- `audio_enabled` e `true` por default ao ativar Pro ou trial, `false` ao downgrade

---

## 5. Constraints

- **CON1:** Desenvolvimento solo com Claude Code como par — escopo deve ser realista para 1 pessoa
- **CON2:** Budget de infraestrutura limitado — maximo ~US$50/mes ate validacao
- **CON3:** Sem Open Finance API no MVP — somente OFX/CSV
- **CON4:** Sem WhatsApp no MVP — somente web app mobile-first; Channel abstraction planejada para facilitar adicao futura sem reescrita
- **CON5:** Timeline de 3-4 meses para MVP funcional
- **CON6:** Conformidade com LGPD obrigatoria desde o dia 1
- **CON7:** Sem publicacao em App Store / Play Store no MVP — acesso via browser

---

## 6. Epic List

### Epic 1: Foundation & Core Infrastructure
Estabelecer o projeto, autenticacao, e pipeline de importacao de extratos com dashboard basico funcional. O usuario sai deste epic conseguindo importar um extrato e ver seus gastos organizados.

### Epic 2: IA — Categorizacao Inteligente
Implementar categorizacao automatica de transacoes com IA, aprendizado por correcao do usuario, e dashboard completo com visualizacoes impactantes por categoria.

### Epic 3: IA Conversacional & Premium
Implementar o assistente de chat em PT-BR, sistema de planos (Free/Premium), paywall, e integracao de pagamentos. O "momento magico" do produto.

### Epic 4: Polish, Billing & Launch
Refinamento de UX, onboarding guiado, integracao completa de pagamentos recorrentes, monitoramento, e preparacao para lancamento em producao.

---

## 7. Epic Details

### Epic 1: Foundation & Core Infrastructure

**Goal:** Entregar o esqueleto funcional do produto — o usuario consegue criar conta, importar um extrato bancario OFX/CSV, e ver suas transacoes parseadas e listadas. Infraestrutura de projeto (Next.js + Supabase), CI/CD, banco de dados, autenticacao e logging estao operacionais.

#### Story 1.1: Project Bootstrap & DevOps Setup

> Como desenvolvedor,
> quero ter o projeto Next.js inicializado com frontend, backend, banco de dados e CI basico,
> para que eu tenha uma base solida para desenvolver todas as features seguintes.

**Acceptance Criteria:**
1. Projeto Next.js com TypeScript inicializado com estrutura de pastas organizada por dominio
2. Supabase projeto criado e conectado (banco PostgreSQL, Auth, Storage configurados)
3. Health-check API route (`/api/health`) retornando 200 com status de conexao ao Supabase
4. Pagina inicial placeholder renderizando no browser mobile
5. Git inicializado com .gitignore adequado, primeiro commit feito
6. Linter (ESLint) e formatter (Prettier) configurados
7. Script de dev (`npm run dev`) funcionando com hot reload
8. Variaveis de ambiente configuradas via .env.local com .env.example documentado (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)
9. Logging estruturado configurado (console em dev, JSON em prod)
10. Supabase client configurado e testado (conexao ao banco funcionando)

#### Story 1.2: User Authentication

> Como usuario,
> quero criar uma conta e fazer login de forma segura,
> para que meus dados financeiros estejam protegidos.

**Acceptance Criteria:**
1. Supabase Auth configurado com provider email/senha (validacao: email valido, senha minima 8 chars)
2. Supabase Auth configurado com provider Google OAuth
3. Paginas de login e cadastro no frontend com formularios funcionais usando Supabase Auth UI ou componentes customizados
4. Sessao gerenciada pelo Supabase (JWT + refresh token automaticos)
5. Middleware Next.js protegendo rotas privadas via verificacao de sessao Supabase
6. RLS (Row Level Security) configurado no Supabase para isolamento de dados por usuario
7. Redirect apos login para dashboard, redirect apos logout para login
8. Tratamento de erros com mensagens claras em PT-BR para o usuario

#### Story 1.3: OFX/CSV Import & Transaction Parsing

> Como usuario,
> quero importar o extrato do meu banco em formato OFX ou CSV,
> para que o app tenha acesso as minhas transacoes sem precisar digitar nada.

**Acceptance Criteria:**
1. API route de upload aceitando arquivos OFX e CSV (max 5MB), armazenando original no Supabase Storage
2. Parser de OFX extraindo: data, valor, descricao, tipo (debito/credito) e identificador unico
3. Parser de CSV com deteccao automatica de delimitador e mapeamento de colunas (pelo menos formato Nubank, Itau, Bradesco)
4. Transacoes parseadas salvas no Supabase (PostgreSQL) vinculadas ao usuario via RLS
5. Deteccao de duplicatas por identificador unico — OFX usa ID nativo do banco; CSV gera external_id sintetico via hash SHA-256 de (date + amount + description normalizada). Transacoes ja importadas sao ignoradas
6. Pagina de importacao: selecionar arquivo, ver progresso, confirmacao de sucesso com contagem
7. Feedback de erro claro se o arquivo for invalido ou formato nao reconhecido
8. Testes unitarios para parsers OFX e CSV com arquivos de exemplo reais

#### Story 1.4: Transaction List & Basic Dashboard

> Como usuario,
> quero ver todas as minhas transacoes importadas organizadas e um resumo do meu mes,
> para que eu tenha visibilidade de para onde vai meu dinheiro.

**Acceptance Criteria:**
1. Tela de lista de transacoes com scroll infinito, mostrando: data, descricao, valor, tipo (entrada/saida)
2. Filtros funcionais: por periodo (mes atual, mes anterior, customizado) e por tipo (receita/despesa)
3. Busca por texto na descricao da transacao
4. Dashboard basico mostrando: total receitas, total despesas, saldo do periodo
5. Dashboard visualmente limpo e impactante mesmo sem categorizacao (agrupamento por dia/semana)
6. Pull-to-refresh para atualizar dados
7. Estado vazio (empty state) com CTA claro para importar primeiro extrato
8. Responsivo e performatico em navegadores mobile de dispositivos Android de entrada

---

### Epic 2: IA — Categorizacao Inteligente

**Goal:** Transformar a lista crua de transacoes em inteligencia financeira visual. A IA categoriza automaticamente cada transacao, o usuario ve seus gastos distribuidos por categoria em visualizacoes impactantes, e pode corrigir categorizacoes para ensinar o sistema.

#### Story 2.1: AI Transaction Categorization Engine

> Como usuario,
> quero que minhas transacoes sejam categorizadas automaticamente,
> para que eu saiba para onde vai meu dinheiro sem precisar classificar nada manualmente.

**Acceptance Criteria:**
1. Servico de categorizacao que recebe lista de transacoes e retorna categoria para cada uma
2. Categorias padrao definidas (14 categorias conforme arquitetura secao 5.2): alimentacao, delivery, transporte, moradia, saude, educacao, lazer, compras, assinaturas, transferencias, salario, investimentos, impostos, outros
3. Categorizacao via Claude API (Haiku) com prompt otimizado para contexto brasileiro
4. Acuracia minima de 85% em transacoes comuns (iFood, Uber, supermercados, etc.)
5. Transacoes categorizadas automaticamente apos importacao (pipeline: import → parse → categorize → save)
6. Categorizacao em batch (todas as transacoes de um extrato de uma vez) para otimizar custo de API
7. Cache de categorizacoes: descricoes identicas reutilizam categoria anterior sem chamar a IA
8. Fallback para "Outros" quando confianca da IA for baixa, com flag para revisao
9. Testes com dataset de pelo menos 100 transacoes brasileiras reais

#### Story 2.2: User Category Correction & Learning

> Como usuario,
> quero poder corrigir a categoria de uma transacao,
> para que o app aprenda minhas preferencias e melhore com o tempo.

**Acceptance Criteria:**
1. Na lista de transacoes, tap em uma transacao abre detalhe com opcao de mudar categoria
2. Selector de categoria com as categorias padrao + opcao de criar categoria customizada
3. Ao corrigir, o sistema salva a regra: "descricao X = categoria Y" no dicionario do usuario
4. Transacoes futuras com mesma descricao usam o dicionario antes de chamar a IA
5. Hierarquia de categorizacao: dicionario do usuario > cache global > IA
6. Endpoint de correcao com persistencia no banco
7. Possibilidade de corrigir em batch (todas as transacoes com mesma descricao de uma vez)

#### Story 2.3: Enhanced Dashboard with Category Visualization

> Como usuario,
> quero ver meus gastos distribuidos por categoria em graficos claros,
> para que eu entenda visualmente para onde vai meu dinheiro.

**Acceptance Criteria:**
1. Grafico de pizza/donut mostrando distribuicao percentual de gastos por categoria
2. Grafico de barras horizontal com ranking de categorias por valor absoluto
3. Cards por categoria com: icone, nome, valor total, percentual do total, numero de transacoes
4. Tap em uma categoria filtra a lista de transacoes para aquela categoria
5. Comparativo simples: indicador de tendencia vs mes anterior (subiu/desceu/estavel) quando houver dados
6. Cores consistentes por categoria em todos os graficos
7. Dashboard carrega em menos de 2 segundos
8. Visualizacao impactante e polida — este e o "momento de valor" do plano Free

---

### Epic 3: IA Conversacional & Planos

**Goal:** Implementar o diferencial competitivo do produto — o assistente de IA que responde perguntas em portugues natural e executa acoes (Pro) usando os dados reais do usuario. Implementar a separacao Basic/Pro, paywall, integracao de pagamentos e entrada por audio (Pro).

#### Story 3.1: Chat Interface & AI Conversational Engine

> Como usuario (Basic ou Pro),
> quero fazer perguntas sobre minhas financas em portugues natural,
> para que eu obtenha insights sem precisar navegar por telas e graficos.

**Acceptance Criteria:**
1. Tela de chat com interface conversacional (mensagens do usuario + respostas da IA)
2. Input de texto com envio por botao ou tecla Enter
3. Resposta da IA em streaming (token por token) para UX responsiva
4. IA tem acesso ao historico completo de transacoes categorizadas do usuario como contexto
5. Responde corretamente a consultas como: "quanto gastei com alimentacao esse mes?", "qual foi meu maior gasto em marco?", "quanto gasto de Uber por mes em media?"
6. Respostas em PT-BR natural, tom acessivel, sem jargao tecnico ou financeiro
7. Quando nao tem dados suficientes para responder, diz claramente em vez de inventar
8. Rate limiting server-side: Basic = 50 perguntas/mes (Haiku); Pro = 200 perguntas/mes (Sonnet)
9. Historico de conversas persistido para continuidade
10. Verificacao server-side obrigatoria do plano na API route — frontend e apenas UX
11. **Pro only:** Function calling habilitado (FR28) — IA executa acoes diretamente na plataforma
12. **Pro only:** Entrada por audio (FR26) — gravar mensagem de voz, transcrever via Whisper, processar como chat normal

#### Story 3.2: Basic/Pro Plan System & Paywall

> Como produto,
> quero separar funcionalidades entre planos Basic e Pro,
> para que todos os usuarios pagantes tenham valor claro e diferenciado.

**Acceptance Criteria:**
1. Modelo de plano no banco: `profiles.plan = 'basic' | 'pro'`; `profiles.audio_enabled = boolean`
2. Sem plano gratuito permanente — trial de 7 dias no Pro ativado automaticamente no cadastro
3. Middleware de autorizacao server-side verificando plano antes de features restritas
4. Features Basic: ate 3 contas, historico ilimitado, categorizacao IA, dashboard basico, comparativos, chat consultas 50/mes (Haiku)
5. Features Pro: contas ilimitadas, tudo do Basic, chat consultas + acoes 200/mes (Sonnet), audio, relatorios avancados
6. Bloqueio de 4a conta no Basic com mensagem de upgrade (nao erro generico)
7. Tela de paywall/upgrade com comparativo Basic vs Pro e CTA claro
8. Paywall aparece de forma nao intrusiva quando usuario tenta feature Pro
9. Demonstracao no paywall: exemplo de acao que o Pro executaria (teaser de function calling)

#### Story 3.3: Payment Integration & Subscription Management

> Como usuario,
> quero assinar o plano Basic ou Pro com pagamento recorrente,
> para que eu tenha acesso continuo as funcionalidades do plano escolhido.

**Acceptance Criteria:**
1. Integracao com Asaas para assinaturas recorrentes (cartao, boleto, Pix)
2. Planos: Basic R$19,90/mes | R$191,00/ano; Pro R$49,90/mes | R$479,00/ano (anual = 2 meses gratis)
3. Fluxo de checkout dentro do app com cartao, boleto e Pix
4. Webhook processando eventos: confirmacao, falha, cancelamento, upgrade/downgrade
5. Mudanca de plano refletida imediatamente no acesso a features e em `audio_enabled`
6. Tela de gerenciamento de assinatura: plano atual, proxima cobranca, trocar plano, cancelar
7. Tratamento de falha de pagamento: notificacao + periodo de graca de 3 dias antes de revogar acesso

---

### Epic 4: Polish, Onboarding & Launch Readiness

**Goal:** Refinar a experiencia completa do usuario, desde o primeiro contato ate o uso recorrente. Onboarding guiado, tratamento de edge cases, monitoramento de producao, e preparacao para lancamento em producao na Vercel.

#### Story 4.1: Guided Onboarding Flow

> Como novo usuario,
> quero ser guiado do cadastro ate ver meu primeiro dashboard,
> para que eu entenda o valor do app em menos de 5 minutos.

**Acceptance Criteria:**
1. Fluxo de onboarding em 3-4 passos apos cadastro: boas-vindas → importar extrato → ver dashboard
2. Instrucoes claras de como exportar extrato OFX/CSV dos principais bancos (Nubank, Itau, Bradesco, Santander, BB, Caixa)
3. Link ou tutorial visual (screenshots) para cada banco suportado
4. Progresso visual do onboarding (stepper)
5. Skip disponivel em cada etapa (usuario pode completar depois)
6. Tempo do fluxo completo (cadastro ate dashboard) inferior a 5 minutos
7. Mensagem in-app de boas-vindas no primeiro login com proximos passos

#### Story 4.2: Edge Cases, Error Handling & Data Management

> Como usuario,
> quero que o app lide bem com situacoes inesperadas e me de controle sobre meus dados,
> para que eu confie no app com minhas informacoes financeiras.

**Acceptance Criteria:**
1. Tratamento de erros em todos os fluxos com mensagens claras em PT-BR
2. Tela de gerenciamento de dados: ver contas conectadas, excluir dados, exportar dados (LGPD)
3. Confirmacao antes de acoes destrutivas (excluir conta, excluir dados)
4. Offline handling: mensagem clara quando sem conexao, dados em cache para visualizacao
5. Timeout handling para chamadas de IA com fallback amigavel
6. Politica de privacidade e termos de uso acessiveis no app
7. Opcao de excluir conta e todos os dados permanentemente (LGPD Art. 18)

#### Story 4.3: Monitoring, Analytics & Production Deploy

> Como desenvolvedor,
> quero monitoramento de erros, analytics basico e deploy em producao na Vercel,
> para que eu possa lancar com confianca e acompanhar metricas.

**Acceptance Criteria:**
1. Sentry integrado para captura de erros em producao (frontend e API routes)
2. Analytics basico: DAU/MAU, importacoes por dia, perguntas ao chat, conversao free→premium
3. Health check endpoint com status de dependencias (Supabase, Claude API)
4. Deploy em producao na Vercel com dominio configurado
5. Build de producao otimizado e testado em navegadores mobile de Android de entrada
6. Variaveis de ambiente de producao configuradas e seguras na Vercel
7. Documentacao minima de deploy e rollback
8. PWA manifest configurado (opcional): icone, nome, splash screen para "Add to Home Screen"

---

## 8. Checklist Results Report

*A ser executado apos aprovacao do PRD pelo usuario.*

---

## 9. Next Steps

### 9.1 UX Expert Prompt

> @ux-design-expert — Revisar o PRD em `docs/prd/prd.md` e criar especificacao de UI/UX para web app financeiro pessoal. Foco: web mobile-first (Next.js, nao app nativo), dashboard impactante que transmita confianca, fluxo de onboarding de menos de 5 minutos, e interface de chat conversacional para o Premium. Persona: CLT 28-38 anos, classe B/C. Referencia visual: Nubank (confianca), Cleo UK (personalidade). Restricao: deve funcionar bem em navegadores mobile de Android de entrada. PWA opcional.

### 9.2 Architect Prompt

> @architect — Revisar o PRD aprovado em `docs/prd/prd.md` e criar arquitetura tecnica para o MVP. Stack confirmada: Next.js fullstack (web mobile-first) na Vercel, Supabase (PostgreSQL + Auth + Storage + Realtime), Claude API (Anthropic), Asaas como gateway de pagamentos. Restricoes: dev solo com Claude Code, budget ~US$50/mes (Supabase free tier + Vercel free tier), preparar abstracoes para Open Finance e WhatsApp futuros (DataSource interface, Channel interface). Decisoes abertas para o Architect: ORM vs Supabase client direto, estrutura de prompts para categorizacao, estrategia de rate limiting de IA por usuario, RLS policies, estrutura de pastas do Next.js.
