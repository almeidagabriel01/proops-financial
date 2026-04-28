'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthError } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';

export type AuthMode = 'login' | 'signup';

export function AuthPage({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [enableTransitions, setEnableTransitions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEnableTransitions(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isSignup = mode === 'signup';

  const switchMode = useCallback(
    (next: AuthMode) => {
      if (next === mode) return;
      setMode(next);
      window.history.replaceState({}, '', next === 'login' ? '/login' : '/signup');
    },
    [mode],
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* Theme toggle — flutua acima dos dois painéis */}
      <div className="absolute top-5 right-5 z-[60]">
        <ThemeToggle />
      </div>

      <div
        className="auth-container flex h-full w-full"
        data-reversed={isSignup ? 'true' : 'false'}
        data-mounted={enableTransitions ? 'true' : 'false'}
      >
        {/* Brand panel — desktop only, desliza via transform */}
        <div className="auth-panel-branding hidden lg:flex h-full w-full flex-col">
          <AuthBrandPanel formOnRight={!isSignup} />
        </div>

        {/* Form panel — ocupa 100% no mobile, 50vw no desktop */}
        <div className="auth-panel-form relative z-20 flex h-full w-full flex-col bg-background shadow-[0_0_60px_-8px_oklch(0_0_0_/_0.12)] dark:shadow-[0_0_60px_-8px_oklch(0_0_0_/_0.45)]">
          {/* Top bar */}
          <div className="flex shrink-0 items-center p-5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <div className="ml-auto flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                F
              </div>
              <span className="text-sm font-bold text-foreground">Finansim</span>
            </div>
          </div>

          {/* Form area */}
          <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 pb-10">
            <div className="w-full max-w-sm">
              <AnimatePresence mode="wait">
                {isSignup ? (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.5, delay: 0.2 } }}
                    exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                  >
                    <Suspense>
                      <SignupFormContent onSwitchMode={() => switchMode('login')} />
                    </Suspense>
                  </motion.div>
                ) : (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.5, delay: 0.2 } }}
                    exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                  >
                    <Suspense>
                      <LoginFormContent onSwitchMode={() => switchMode('signup')} />
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Login form ─────────────────────────────────────────── */

function LoginFormContent({ onSwitchMode }: { onSwitchMode: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountDeleted = searchParams.get('deleted') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um email válido');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(getAuthError(error.message)); return; }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/callback` },
      });
      if (error) { setError(getAuthError(error.message)); setLoading(false); }
    } catch {
      setError('Erro de conexão. Tente novamente');
      setLoading(false);
    }
  }

  return (
    <>
      {accountDeleted && (
        <div role="alert" className="mb-6 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-foreground">
          Sua conta foi excluída com sucesso. Todos os seus dados foram removidos permanentemente.
        </div>
      )}
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bem-vindo de volta! Insira suas credenciais.</p>
      </div>
      <form onSubmit={handleEmailLogin} className="flex flex-col gap-4" noValidate>
        <FieldEmail value={email} onChange={setEmail} disabled={loading} />
        <FieldPassword
          value={password} onChange={setPassword}
          show={showPassword} onToggleShow={() => setShowPassword(v => !v)}
          placeholder="Sua senha" autoComplete="current-password" disabled={loading}
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <OrDivider />
      <Button variant="outline" size="lg" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
        <GoogleIcon />Entrar com Google
      </Button>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <button type="button" onClick={onSwitchMode} className="font-medium text-primary hover:underline">
          Criar agora
        </button>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>
        {' · '}
        <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link>
      </p>
    </>
  );
}

/* ─── Signup form ────────────────────────────────────────── */

function SignupFormContent({ onSwitchMode }: { onSwitchMode: () => void }) {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') ?? '';
  const intentParam = searchParams.get('intent') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const callbackBase = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/callback`;

  function setPendingCheckoutCookie() {
    if (!planParam) return;
    // Cookie sobrevive ao redirect do OAuth (SameSite=Lax permite top-level navigation cross-site)
    document.cookie = `pending_checkout=${encodeURIComponent(`${planParam}:${intentParam || 'paid'}`)}; path=/; max-age=600; SameSite=Lax`;
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um email válido');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      setPendingCheckoutCookie();
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: callbackBase },
      });
      if (error) { setError(getAuthError(error.message)); return; }
      setSuccess(true);
    } catch {
      setError('Erro de conexão. Tente novamente');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError('');
    setLoading(true);
    try {
      setPendingCheckoutCookie();
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackBase },
      });
      if (error) { setError(getAuthError(error.message)); setLoading(false); }
    } catch {
      setError('Erro de conexão. Tente novamente');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-7 w-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Confirme seu email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos um link de confirmação para{' '}
          <strong className="text-foreground">{email}</strong>. Verifique sua caixa de entrada e clique no link para ativar sua conta.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Já confirmou?{' '}
          <button type="button" onClick={onSwitchMode} className="font-medium text-primary hover:underline">
            Fazer login
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Criar conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Comece gratuitamente. Premium com IA.</p>
      </div>
      <Button variant="outline" size="lg" className="w-full" onClick={handleGoogleSignup} disabled={loading}>
        <GoogleIcon />Continuar com Google
      </Button>
      <OrDivider />
      <form onSubmit={handleEmailSignup} className="flex flex-col gap-4" noValidate>
        <FieldEmail value={email} onChange={setEmail} disabled={loading} />
        <FieldPassword
          value={password} onChange={setPassword}
          show={showPassword} onToggleShow={() => setShowPassword(v => !v)}
          placeholder="Mínimo 8 caracteres" autoComplete="new-password" disabled={loading}
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
          {loading ? 'Criando conta...' : 'Criar conta gratuita'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <button type="button" onClick={onSwitchMode} className="font-medium text-primary hover:underline">
          Entrar
        </button>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Ao criar sua conta, você concorda com os{' '}
        <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link>{' '}
        e a{' '}
        <Link href="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
      </p>
    </>
  );
}

/* ─── Shared field components ────────────────────────────── */

function FieldEmail({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="email" className="text-sm font-medium text-foreground">
        Email <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="email" type="email" autoComplete="email"
          value={value} onChange={e => onChange(e.target.value)}
          placeholder="seu@email.com" disabled={disabled}
          className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
        />
      </div>
    </div>
  );
}

function FieldPassword({ value, onChange, show, onToggleShow, placeholder, autoComplete, disabled }: {
  value: string; onChange: (v: string) => void;
  show: boolean; onToggleShow: () => void;
  placeholder: string; autoComplete: string; disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="password" className="text-sm font-medium text-foreground">
        Senha <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="password" type={show ? 'text' : 'password'} autoComplete={autoComplete}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} disabled={disabled}
          className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
        />
        <button
          type="button" onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-background px-2 uppercase tracking-wide text-muted-foreground">ou</span>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
