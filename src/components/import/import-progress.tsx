'use client';

export type ImportStatus = 'uploading' | 'processing' | 'categorizing' | 'completed' | 'failed';

interface ImportProgressProps {
  status: ImportStatus;
  transactionCount?: number;
  duplicatesSkipped?: number;
  errorMessage?: string;
}

export function ImportProgress({
  status,
  transactionCount,
  duplicatesSkipped,
  errorMessage,
}: ImportProgressProps) {
  if (status === 'uploading') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner />
        <p className="text-sm font-medium text-foreground">Enviando arquivo...</p>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner />
        <p className="text-sm font-medium text-foreground">Processando extrato...</p>
        <p className="text-xs text-muted-foreground">Detectando e lendo transações</p>
      </div>
    );
  }

  if (status === 'categorizing') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner />
        <p className="text-sm font-medium text-foreground">Categorizando transações...</p>
        <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl dark:bg-green-900/30">
          ✅
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Pronto!</p>
          {transactionCount !== undefined && (
            <p className="mt-1 text-sm text-muted-foreground">
              {transactionCount} {transactionCount === 1 ? 'transação importada' : 'transações importadas'}
              {duplicatesSkipped !== undefined && duplicatesSkipped > 0 && (
                <>, {duplicatesSkipped} duplicatas ignoradas</>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-900/30">
          ❌
        </div>
        <div>
          <p className="text-sm font-medium text-destructive">Erro ao processar arquivo</p>
          {errorMessage && (
            <p className="mt-1 text-xs text-muted-foreground">{errorMessage}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function Spinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  );
}
