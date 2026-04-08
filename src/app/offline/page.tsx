'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-xl font-bold text-foreground">Sem conexão</h1>
      <p className="text-sm text-muted-foreground">
        Você está offline. Conecte-se à internet para acessar o Finansim.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Tentar novamente
      </button>
    </div>
  );
}
