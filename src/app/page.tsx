import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { MobileMenuButton } from '@/components/landing/mobile-nav';
import {
  HeroFade,
  FadeUp,
  StaggerContainer,
  StaggerItem,
} from '@/components/landing/motion-primitives';

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
  robots: { index: true, follow: true },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="min-h-dvh bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <CtaFinalSection />
      </main>
      <LandingFooter />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════════ */

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white transition-opacity group-hover:opacity-80 dark:bg-white dark:text-zinc-950">
            F
          </div>
          <span className="text-base font-bold tracking-tight">Finansim</span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            Entrar
          </Link>
          <Link
            href="/signup?plan=pro_monthly&intent=trial"
            className="inline-flex h-9 items-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
          >
            Testar Pro grátis
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <MobileMenuButton />
        </div>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO
══════════════════════════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="overflow-hidden px-4 pb-0 pt-16 sm:pt-24 lg:pt-32">
      <div className="mx-auto max-w-5xl">
        {/* Headline */}
        <HeroFade delay={0.13} className="mb-8 text-center">
          <h1 className="text-5xl font-bold leading-none tracking-tighter text-zinc-950 dark:text-white md:text-7xl lg:text-8xl">
            Suas finanças,
            <br />
            finalmente
            <br />
            <span className="text-zinc-400 dark:text-zinc-600">organizadas.</span>
          </h1>
        </HeroFade>

        {/* Subheadline */}
        <HeroFade delay={0.26} className="mb-10 flex justify-center">
          <p className="max-w-md text-center text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Importe extratos, deixe a IA categorizar automaticamente e converse com seu assistente
            financeiro pessoal em português.
          </p>
        </HeroFade>

        {/* CTAs */}
        <HeroFade
          delay={0.39}
          className="mb-16 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/signup?plan=pro_monthly&intent=trial"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-8 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-zinc-800 hover:shadow-lg dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 sm:w-auto"
          >
            Testar Pro grátis
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-200 px-8 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 sm:w-auto"
          >
            Ver como funciona
          </a>
        </HeroFade>

        {/* Dashboard Mockup */}
        <HeroFade delay={0.56} className="relative mx-auto max-w-3xl">
          {/* Bottom fade */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-28 bg-gradient-to-t from-white dark:from-zinc-950"
          />

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="flex gap-1.5" aria-hidden="true">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <div className="mx-auto flex h-5 w-48 items-center justify-center rounded-md bg-zinc-200/60 dark:bg-zinc-800">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  finansim.app/dashboard
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {/* Period */}
              <div className="mb-5 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Abril 2026
                </p>
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  Atualizado agora
                </span>
              </div>

              {/* Stats */}
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Receitas', value: 'R$ 5.200', sub: '+12% vs março', pos: true },
                  { label: 'Despesas', value: 'R$ 3.840', sub: '−5% vs março', pos: false },
                  { label: 'Saldo', value: 'R$ 1.360', sub: 'Este mês', pos: true },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700/50 dark:bg-zinc-800/50"
                  >
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      {s.label}
                    </p>
                    <p className="text-sm font-bold text-zinc-950 dark:text-white sm:text-base">
                      {s.value}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-medium ${s.pos ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400'}`}
                    >
                      {s.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="mb-5 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-700/50 dark:bg-zinc-800/50">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Gastos por categoria
                </p>
                <div className="flex h-16 items-end gap-1.5">
                  {[
                    { w: 'flex-[2]', h: '85%', label: 'Alimentação' },
                    { w: 'flex-[1.4]', h: '55%', label: 'Transporte' },
                    { w: 'flex-[1.2]', h: '40%', label: 'Saúde' },
                    { w: 'flex-[1.6]', h: '65%', label: 'Lazer' },
                    { w: 'flex-[1.1]', h: '35%', label: 'Assinat.' },
                    { w: 'flex-[0.8]', h: '22%', label: 'Outros' },
                  ].map((bar) => (
                    <div key={bar.label} className={`${bar.w} flex flex-col items-center gap-1`}>
                      <div
                        className="w-full rounded-sm bg-zinc-800 dark:bg-zinc-300"
                        style={{ height: bar.h }}
                        aria-label={bar.label}
                      />
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions */}
              <div className="space-y-2">
                {[
                  { icon: '🛒', name: 'iFood', cat: 'Delivery', val: '−R$ 54,90' },
                  { icon: '🚗', name: 'Uber', cat: 'Transporte', val: '−R$ 23,50' },
                  { icon: '💊', name: 'Droga Raia', cat: 'Saúde', val: '−R$ 87,20' },
                ].map((tx) => (
                  <div
                    key={tx.name}
                    className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base" aria-hidden="true">
                        {tx.icon}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                          {tx.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{tx.cat}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {tx.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </HeroFade>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMO FUNCIONA
══════════════════════════════════════════════════════════════ */

function HowItWorksSection() {
  const steps = [
    {
      n: '01',
      title: 'Importe seu extrato',
      desc: 'Exporte o arquivo OFX ou CSV do seu banco — Nubank, Itaú, Bradesco ou qualquer outro. Upload em segundos.',
    },
    {
      n: '02',
      title: 'IA categoriza tudo',
      desc: 'Cada transação é classificada automaticamente com contexto brasileiro. iFood = Delivery. Uber = Transporte. Sem esforço.',
    },
    {
      n: '03',
      title: 'Converse e entenda',
      desc: 'Pergunte em português sobre seus gastos reais. "Quanto gastei com alimentação este mês?" — resposta instantânea.',
    },
  ];

  return (
    <section id="como-funciona" className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <FadeUp className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Como funciona
          </p>
          <h2 className="text-4xl font-bold tracking-tighter text-zinc-950 dark:text-white sm:text-5xl">
            Simples assim.
          </h2>
        </FadeUp>

        <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
          {/* Connector line desktop */}
          <div
            aria-hidden="true"
            className="absolute left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] top-8 hidden border-t border-dashed border-zinc-200 dark:border-zinc-800 sm:block"
          />

          {steps.map((s, i) => (
            <FadeUp key={s.n} delay={i * 0.12} className="relative flex flex-col gap-4">
              <div className="flex items-start gap-4 sm:flex-col sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 sm:mx-auto">
                  <span className="text-xs font-bold tracking-widest text-zinc-400 dark:text-zinc-600">
                    {s.n}
                  </span>
                </div>
                <div className="sm:text-center">
                  <h3 className="mb-2 text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {s.desc}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FEATURES
══════════════════════════════════════════════════════════════ */

function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      ),
      title: 'Categorização automática com IA',
      desc: 'Cada transação classificada em 14 categorias com contexto brasileiro. Aprende com suas correções para ficar cada vez mais preciso.',
    },
    {
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      ),
      title: 'Chat financeiro inteligente',
      desc: 'Pergunte sobre seus gastos em português natural. "Quanto gastei com Uber em fevereiro?" — resposta baseada nos seus dados reais.',
    },
    {
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
      title: 'Dashboard visual completo',
      desc: 'Receitas, despesas e saldo consolidados. Gráficos por categoria e comparativos mensais para todos os planos.',
    },
    {
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      ),
      title: 'Privacidade e segurança LGPD',
      desc: 'Dados isolados por RLS. Conformidade com LGPD, consentimento explícito e direito de exclusão completo desde o dia 1.',
    },
  ];

  return (
    <section className="bg-zinc-50 px-4 py-20 dark:bg-zinc-900/40 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <FadeUp className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Funcionalidades
          </p>
          <h2 className="text-4xl font-bold tracking-tighter text-zinc-950 dark:text-white sm:text-5xl">
            Tudo que você precisa.
          </h2>
        </FadeUp>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <StaggerItem
              key={f.title}
              className="group flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {f.icon}
              </div>
              <div>
                <h3 className="mb-1.5 text-sm font-bold text-zinc-950 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{f.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   PRICING
══════════════════════════════════════════════════════════════ */

const BASIC_FEATURES = [
  '3 contas bancárias',
  'Histórico ilimitado de transações',
  'Categorização automática com IA',
  'Dashboard completo + comparativos mensais',
  'Chat IA (Gemini Flash) — 50 perguntas/mês',
  'Importação OFX e CSV',
  'Suporte por email',
];

const PRO_FEATURES = [
  'Contas bancárias ilimitadas',
  'Histórico ilimitado de transações',
  'Categorização automática com IA',
  'Dashboard completo + comparativos mensais',
  'Chat IA avançado (Gemini Pro) — 200 perguntas/mês',
  'Ações por IA: metas, orçamentos, transações',
  'Entrada por áudio (transcrição automática)',
  'Importação OFX e CSV',
  'Suporte prioritário',
];

function PricingSection() {
  return (
    <section id="precos" className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <FadeUp className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Preços
          </p>
          <h2 className="mb-3 text-4xl font-bold tracking-tighter text-zinc-950 dark:text-white sm:text-5xl">
            Preço justo, sem surpresas.
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">Pro com 7 dias de trial. Basic sem trial, assine direto.</p>
        </FadeUp>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 sm:items-start">
          {/* Basic */}
          <StaggerItem className="flex flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
              Basic
            </p>
            <div className="mb-1 flex items-baseline gap-0.5">
              <span className="text-4xl font-bold tracking-tighter text-zinc-950 dark:text-white">
                R$ 19
              </span>
              <span className="text-xl font-bold text-zinc-950 dark:text-white">,90</span>
              <span className="ml-1 text-sm text-zinc-400 dark:text-zinc-500">/mês</span>
            </div>
            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              Controle financeiro completo sem complicação.
            </p>
            <Link
              href="/signup?plan=basic_monthly&intent=paid"
              className="mb-6 inline-flex h-10 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-950 transition-all hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
            >
              Assinar Basic
            </Link>
            <ul className="flex flex-col gap-3">
              {BASIC_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <CheckMark />
                  {f}
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* Pro — inverted card */}
          <StaggerItem className="relative flex flex-col rounded-2xl bg-zinc-950 p-6 dark:bg-zinc-100">
            <div className="absolute -top-3 left-6">
              <span className="inline-flex items-center rounded-full bg-zinc-950 px-3 py-0.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
                Mais popular
              </span>
            </div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
              Pro
            </p>
            <div className="mb-1 flex items-baseline gap-0.5">
              <span className="text-4xl font-bold tracking-tighter text-white dark:text-zinc-950">
                R$ 49
              </span>
              <span className="text-xl font-bold text-white dark:text-zinc-950">,90</span>
              <span className="ml-1 text-sm text-zinc-500 dark:text-zinc-500">/mês</span>
            </div>
            <p className="mb-6 text-sm text-zinc-400 dark:text-zinc-600">
              O assistente financeiro completo com IA avançada.
            </p>
            <div className="mb-6 flex flex-col gap-2">
              <Link
                href="/signup?plan=pro_monthly&intent=trial"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.01] hover:bg-zinc-100 hover:shadow-lg dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
              >
                Testar 7 dias grátis
              </Link>
              <Link
                href="/signup?plan=pro_monthly&intent=paid"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-zinc-700 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white dark:border-zinc-300 dark:text-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-950"
              >
                Assinar agora
              </Link>
            </div>
            <ul className="flex flex-col gap-3">
              {PRO_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-zinc-400 dark:text-zinc-600"
                >
                  <CheckMark inverted />
                  {f}
                </li>
              ))}
            </ul>
          </StaggerItem>
        </StaggerContainer>

        <FadeUp delay={0.2} className="mt-6 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Pagamento via Pix, boleto ou cartão. Sem fidelidade.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function CheckMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <svg
      className={`mt-0.5 h-4 w-4 shrink-0 ${inverted ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-400 dark:text-zinc-500'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   CTA FINAL
══════════════════════════════════════════════════════════════ */

function CtaFinalSection() {
  return (
    <section className="px-4 py-20 sm:py-28">
      <FadeUp className="mx-auto max-w-2xl text-center">
        <h2 className="mb-3 text-5xl font-bold tracking-tighter text-zinc-950 dark:text-white sm:text-6xl">
          Comece hoje.
        </h2>
        <p className="mb-8 text-lg text-zinc-500 dark:text-zinc-400">
          7 dias de trial no Pro. Cancele quando quiser.
        </p>
        <Link
          href="/signup?plan=pro_monthly&intent=trial"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-10 text-base font-bold text-white transition-all hover:scale-[1.02] hover:bg-zinc-800 hover:shadow-xl dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
        >
          Testar Pro 7 dias grátis
        </Link>
      </FadeUp>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════ */

function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200 px-4 py-8 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">
            F
          </div>
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">Finansim</span>
          <span className="text-sm text-zinc-400 dark:text-zinc-600">© 2026</span>
        </div>

        <nav aria-label="Links do rodapé">
          <ul className="flex items-center gap-5">
            {[
              { href: '/privacy', label: 'Privacidade' },
              { href: '/terms', label: 'Termos' },
              { href: '/login', label: 'Entrar' },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-zinc-400 transition-colors hover:text-zinc-950 dark:text-zinc-600 dark:hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
