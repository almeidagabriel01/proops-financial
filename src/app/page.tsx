import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Finansim — Suas finanças, finalmente organizadas',
  description:
    'Importe seus extratos bancários, deixe a IA categorizar automaticamente e converse com seu assistente financeiro pessoal. Experimente grátis por 7 dias.',
  keywords: [
    'finanças pessoais',
    'controle financeiro',
    'inteligência artificial',
    'categorização automática',
    'extrato bancário',
    'OFX',
    'CSV',
    'Brasil',
  ],
  openGraph: {
    title: 'Finansim — Suas finanças, finalmente organizadas',
    description:
      'Importe seus extratos, categorize automaticamente com IA e converse com seu assistente financeiro pessoal.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Finansim',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finansim — Suas finanças, finalmente organizadas',
    description:
      'Importe seus extratos, categorize automaticamente com IA e converse com seu assistente financeiro pessoal.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Nav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}

/* ─────────────────────────── NAV ─────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            F
          </div>
          <span className="font-semibold tracking-tight text-foreground">Finansim</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:pt-24">
      {/* Background gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.35 0.08 240 / 8%) 0%, transparent 70%)',
        }}
      />

      <div className="mx-auto max-w-5xl">
        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent"
            />
            Trial grátis por 7 dias — sem cartão de crédito
          </span>
        </div>

        {/* Headline */}
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Suas finanças,{' '}
            <span className="text-primary">finalmente organizadas</span>
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Importe seus extratos, categorize automaticamente com IA e converse com
            seu assistente financeiro pessoal em português.
          </p>
        </div>

        {/* CTAs */}
        <div className="mb-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 sm:w-auto"
          >
            Começar grátis por 7 dias
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-8 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            Ver como funciona
          </a>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            {/* Mockup top bar */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <div className="ml-2 h-4 w-32 rounded bg-border/60 text-center text-xs leading-4 text-muted-foreground">
                finansim.app/dashboard
              </div>
            </div>

            {/* Mockup dashboard content */}
            <div className="p-4 sm:p-6">
              {/* Stats row */}
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Receitas', value: 'R$ 5.200', color: 'text-accent' },
                  { label: 'Despesas', value: 'R$ 3.840', color: 'text-destructive' },
                  { label: 'Saldo', value: 'R$ 1.360', color: 'text-foreground' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-background p-3">
                    <p className="mb-1 text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-sm font-bold sm:text-base ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div className="mb-5 rounded-xl border border-border bg-background p-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">Gastos por categoria</p>
                <div className="flex items-end gap-2 h-20">
                  {[
                    { label: 'Alim.', height: '85%', color: 'bg-chart-1' },
                    { label: 'Trans.', height: '50%', color: 'bg-chart-2' },
                    { label: 'Saúde', height: '35%', color: 'bg-chart-3' },
                    { label: 'Lazer', height: '60%', color: 'bg-chart-4' },
                    { label: 'Comp.', height: '45%', color: 'bg-chart-5' },
                    { label: 'Outros', height: '25%', color: 'bg-muted-foreground' },
                  ].map((bar) => (
                    <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-sm ${bar.color} opacity-80`}
                        style={{ height: bar.height }}
                      />
                      <span className="text-[9px] text-muted-foreground">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions list */}
              <div className="space-y-2">
                {[
                  { icon: '🛒', desc: 'iFood', cat: 'Delivery', value: '-R$ 54,90', color: 'text-destructive' },
                  { icon: '🚗', desc: 'Uber', cat: 'Transporte', value: '-R$ 23,50', color: 'text-destructive' },
                  { icon: '💊', desc: 'Droga Raia', cat: 'Saúde', value: '-R$ 87,20', color: 'text-destructive' },
                ].map((tx) => (
                  <div
                    key={tx.desc}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base" aria-hidden="true">{tx.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{tx.desc}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.cat}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${tx.color}`}>{tx.value}</span>
                  </div>
                ))}
              </div>

              {/* AI badge */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                <span aria-hidden="true" className="text-sm">✨</span>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-accent-foreground">IA:</span> Você gastou 22% mais com delivery este mês. Quer ver uma análise?
                </p>
              </div>
            </div>
          </div>

          {/* Decorative glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl opacity-20"
            style={{
              background:
                'radial-gradient(ellipse at center, oklch(0.35 0.08 240 / 30%) 0%, transparent 70%)',
            }}
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── COMO FUNCIONA ─────────────────────── */

function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      ),
      title: 'Importe seu extrato',
      description:
        'Exporte o extrato do seu banco em OFX ou CSV e faça upload no Finansim. Suporte para Nubank, Itaú, Bradesco e qualquer banco que gere OFX.',
    },
    {
      number: '02',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
      title: 'IA categoriza automaticamente',
      description:
        'Nossa IA reconhece o contexto brasileiro: iFood vai para Delivery, Uber vai para Transporte, Droga Raia vai para Saúde. Zero digitação.',
    },
    {
      number: '03',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      title: 'Converse com seu assistente',
      description:
        'Pergunte em português natural: "Quanto gastei com alimentação em março?" ou "Qual meu maior gasto?". A IA responde com seus dados reais.',
    },
  ];

  return (
    <section id="como-funciona" className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Como funciona
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Três passos para o controle total
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative flex flex-col gap-4">
              {/* Connector line (not on last item) */}
              {idx < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute left-[calc(50%+2rem)] top-7 hidden h-px w-[calc(100%-4rem)] border-t border-dashed border-border sm:block"
                />
              )}

              <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {step.icon}
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold tracking-widest text-muted-foreground">
                    {step.number}
                  </p>
                  <h3 className="mb-2 text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FEATURES ─────────────────────────── */

function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
      title: 'Categorização automática com IA',
      description:
        'Cada transação é categorizada automaticamente em 14 categorias com contexto brasileiro. Sem digitar, sem selecionar, sem esforço.',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      title: 'Chat financeiro inteligente',
      description:
        'Pergunte em português sobre seus gastos reais. "Quanto gastei com Uber em fevereiro?" — resposta instantânea com seus dados.',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      title: 'Dashboard visual completo',
      description:
        'Visão consolidada dos seus gastos: total de receitas, despesas, saldo e distribuição por categoria com gráficos limpos e intuitivos.',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: 'Segurança e privacidade LGPD',
      description:
        'Seus dados ficam isolados por RLS no banco. Conformidade com LGPD, direito de exclusão completo e consentimento explícito.',
    },
  ];

  return (
    <section className="bg-muted/30 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Funcionalidades
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa, sem complicação
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── PRICING ─────────────────────────── */

const BASIC_FEATURES = [
  '3 contas bancárias',
  'Histórico ilimitado de transações',
  'Categorização automática com IA',
  'Dashboard completo + comparativos mensais',
  'Chat IA com Haiku — 50 perguntas/mês',
  'Importação OFX e CSV',
  'Suporte por email',
];

const PRO_FEATURES = [
  'Contas bancárias ilimitadas',
  'Histórico ilimitado de transações',
  'Categorização automática com IA',
  'Dashboard completo + comparativos mensais',
  'Chat IA com Sonnet — 200 perguntas/mês',
  'Ações por IA: criar metas, orçamentos, transações',
  'Entrada por áudio (transcrição Whisper)',
  'Importação OFX e CSV',
  'Suporte prioritário',
];

function PricingSection() {
  return (
    <section id="precos" className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Planos e preços
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Comece grátis, evolua quando quiser
          </h2>
          <p className="mt-3 text-muted-foreground">
            7 dias de trial Pro gratuito em qualquer plano — sem cartão de crédito
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Basic */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-6">
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Basic
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">R$ 19</span>
                <span className="text-xl font-bold text-foreground">,90</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Para quem quer controle financeiro sem complicação.
              </p>
            </div>

            <Link
              href="/signup"
              className="mb-6 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Começar trial gratuito
            </Link>

            <ul className="flex flex-col gap-3">
              {BASIC_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckIcon />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-elevated">
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Mais popular
              </span>
            </div>

            <div className="mb-6">
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-primary">
                Pro
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">R$ 49</span>
                <span className="text-xl font-bold text-foreground">,90</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Para quem quer o assistente financeiro completo com IA avançada.
              </p>
            </div>

            <Link
              href="/signup"
              className="mb-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Começar trial gratuito
            </Link>

            <ul className="flex flex-col gap-3">
              {PRO_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckIcon className="text-primary" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pagamento via Pix, boleto ou cartão de crédito. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`mt-0.5 h-4 w-4 shrink-0 ${className || 'text-accent'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/* ─────────────────────────── TESTIMONIALS ─────────────────────────── */

function TestimonialsSection() {
  const testimonials = [
    {
      initials: 'AC',
      name: 'Ana C.',
      role: 'Professora',
      quote:
        'Finalmente entendo para onde vai meu dinheiro todo mês. A IA categoriza tudo certinho, não preciso fazer nada.',
    },
    {
      initials: 'RM',
      name: 'Rafael M.',
      role: 'Desenvolvedor',
      quote:
        'O chat financeiro é incrível. Perguntei quanto gastei com iFood no último trimestre e recebi a resposta em segundos.',
    },
    {
      initials: 'JP',
      name: 'Juliana P.',
      role: 'Autônoma',
      quote:
        'Usei por 3 dias e já descobri que estava gastando R$ 800/mês com assinaturas que não sabia que tinha.',
    },
  ];

  return (
    <section className="bg-muted/30 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Depoimentos
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            O que dizem os usuários
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <p className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FOOTER ─────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            F
          </div>
          <span className="text-sm font-medium text-foreground">Finansim</span>
          <span className="text-sm text-muted-foreground">© 2026</span>
        </div>

        <nav aria-label="Links do rodapé">
          <ul className="flex items-center gap-4">
            {[
              { href: '/privacy', label: 'Privacidade' },
              { href: '/terms', label: 'Termos' },
              { href: '/login', label: 'Entrar' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
