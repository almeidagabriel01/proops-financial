import { cn } from '@/lib/utils';

interface AuthBrandPanelProps {
  formOnRight?: boolean;
}

export function AuthBrandPanel({ formOnRight = true }: AuthBrandPanelProps) {
  return (
    <div className="flex w-full h-full relative flex-col items-center justify-center overflow-hidden bg-zinc-950 dark:bg-zinc-900">
      {/* Subtle glow blobs */}
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute top-1/2 right-12 h-48 w-48 rounded-full bg-white/[0.03] blur-2xl" />

      {/* Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base font-bold text-zinc-950 shadow-sm">
          F
        </div>
        <span className="text-lg font-bold text-white">Finansim</span>
      </div>

      {/* Center content */}
      <div className="relative z-10 max-w-sm px-8 text-center">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Finanças Pessoais com IA
        </p>
        <h2 className="text-[2.2rem] font-extrabold leading-tight tracking-tight text-white">
          Suas finanças,{' '}
          <span className="text-zinc-300">finalmente</span>{' '}
          <span className="bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            organizadas.
          </span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          As ferramentas essenciais para você entender e controlar seus gastos com inteligência artificial.
        </p>
      </div>

      {/* Edge depth gradient — faces the form panel */}
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 w-20',
          formOnRight
            ? 'right-0 bg-gradient-to-r from-transparent to-black/30'
            : 'left-0 bg-gradient-to-l from-transparent to-black/30',
        )}
      />

      {/* Footer links */}
      <div className="absolute bottom-6 flex items-center gap-3 text-xs text-zinc-600">
        <a href="/terms" className="transition-colors hover:text-zinc-300">
          Termos
        </a>
        <span>·</span>
        <a href="/privacy" className="transition-colors hover:text-zinc-300">
          Privacidade
        </a>
      </div>
    </div>
  );
}
