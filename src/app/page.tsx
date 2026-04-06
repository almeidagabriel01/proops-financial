import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex max-w-md flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground">
            F
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Finansim</h1>
          <p className="text-lg text-muted-foreground">Seu dinheiro, organizado por IA</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Importe seu extrato bancário e veja seus gastos categorizados automaticamente. Sem
          digitação, sem planilha, sem esforço.
        </p>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/signup"
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Começar agora
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Já tenho conta
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Gratuito para sempre. Premium com IA conversacional.
        </p>
      </main>
    </div>
  );
}
