'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileDropzone } from '@/components/import/file-dropzone';
import { ImportProgress, type ImportStatus } from '@/components/import/import-progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlan } from '@/hooks/use-plan';
import { PaywallModal } from '@/components/layout/paywall-modal';
import { cn } from '@/lib/utils';

const BANK_OPTIONS = [
  { value: 'Nubank', label: 'Nubank' },
  { value: 'Itaú', label: 'Itaú' },
  { value: 'Bradesco', label: 'Bradesco' },
  { value: 'Outro', label: 'Outro' },
];

const STEPS = ['Escolher banco', 'Selecionar arquivo', 'Importar'];

// Polling fallback: starts after this delay if Realtime hasn't fired
const REALTIME_TIMEOUT_MS = 6000;
const POLL_INTERVAL_MS = 3000;
// Safety net: if categorization never resolves, fail after this duration (from polling start)
const MAX_POLL_DURATION_MS = 90_000;

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('Nubank');
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [transactionCount, setTransactionCount] = useState<number | undefined>();
  const [duplicatesSkipped, setDuplicatesSkipped] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [alreadyImportedDialog, setAlreadyImportedDialog] = useState<{
    open: boolean;
    duplicatesSkipped: number;
  }>({ open: false, duplicatesSkipped: 0 });

  const { isBasic, maxBankAccounts } = usePlan();

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Current step derived from state
  const currentStep = !selectedFile ? 0 : !importStatus ? 1 : 2;

  // Realtime subscription for import status updates
  useEffect(() => {
    if (!importId) return;

    const channel = supabase
      .channel(`import-${importId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'imports',
          filter: `id=eq.${importId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as ImportStatus;
          setImportStatus(newStatus);
          if (newStatus === 'completed') {
            setTransactionCount(payload.new.transaction_count as number);
            setDuplicatesSkipped(payload.new.duplicates_skipped as number);
          }
          if (newStatus === 'failed') {
            setErrorMessage((payload.new.error_message as string) ?? 'Erro desconhecido');
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [importId, supabase]);

  // Polling fallback
  useEffect(() => {
    if (importStatus !== 'categorizing' || !importId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let maxPollTimeout: ReturnType<typeof setTimeout> | null = null;

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        const { data, error } = await supabase
          .from('imports')
          .select('status, transaction_count, duplicates_skipped, error_message')
          .eq('id', importId)
          .single();

        if (error) {
          console.error('[import] Polling error:', error);
          return;
        }

        if (!data || data.status === 'categorizing') return;

        const resolvedStatus = data.status as ImportStatus;
        setImportStatus(resolvedStatus);

        if (resolvedStatus === 'completed') {
          setTransactionCount(data.transaction_count ?? undefined);
          setDuplicatesSkipped(data.duplicates_skipped ?? undefined);
        }
        if (resolvedStatus === 'failed') {
          setErrorMessage(data.error_message ?? 'Erro desconhecido');
        }

        if (pollInterval) clearInterval(pollInterval);
        if (maxPollTimeout) clearTimeout(maxPollTimeout);
      }, POLL_INTERVAL_MS);

      maxPollTimeout = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        setImportStatus('failed');
        setErrorMessage('Categorização está demorando mais do que o esperado. Tente novamente.');
      }, MAX_POLL_DURATION_MS);
    };

    const timeout = setTimeout(startPolling, REALTIME_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      if (pollInterval) clearInterval(pollInterval);
      if (maxPollTimeout) clearTimeout(maxPollTimeout);
    };
  }, [importId, importStatus, supabase]);

  const handleImport = useCallback(async (force = false) => {
    if (!selectedFile) return;

    if (!force && isBasic) {
      const { count } = await supabase
        .from('bank_accounts')
        .select('*', { count: 'exact', head: true });

      if ((count ?? 0) >= maxBankAccounts) {
        setPaywallOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    setImportStatus('uploading');
    setErrorMessage(undefined);
    setAlreadyImportedDialog({ open: false, duplicatesSkipped: 0 });

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bank_name', bankName);
    if (force) formData.append('force', 'true');

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setImportStatus('failed');
        setErrorMessage(data.error ?? 'Erro ao processar arquivo');
        return;
      }

      // Extrato 100% duplicado e não é uma re-importação forçada → mostrar dialog
      if (data.alreadyImported) {
        setImportStatus(null);
        setAlreadyImportedDialog({ open: true, duplicatesSkipped: data.duplicatesSkipped });
        return;
      }

      setImportId(data.importId);
      setTransactionCount(data.transactionCount);
      setDuplicatesSkipped(data.duplicatesSkipped);
      setImportStatus(data.status as ImportStatus);
    } catch {
      setImportStatus('failed');
      setErrorMessage('Erro de conexão. Tente novamente');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFile, bankName, isBasic, maxBankAccounts, supabase]);

  function handleReset() {
    setSelectedFile(null);
    setImportStatus(null);
    setImportId(null);
    setTransactionCount(undefined);
    setDuplicatesSkipped(undefined);
    setErrorMessage(undefined);
  }

  const isProcessing =
    importStatus === 'uploading' ||
    importStatus === 'processing' ||
    importStatus === 'categorizing';

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-28">
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature="accounts" />

        {/* Desktop hero */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold text-foreground">Importar Extrato</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie o extrato do seu banco em formato OFX ou CSV
          </p>
        </div>

        {/* Mobile title */}
        <div className="mb-6 lg:hidden">
          <h1 className="text-xl font-bold text-foreground">Importar Extrato</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie o extrato do seu banco em formato OFX ou CSV
          </p>
        </div>

        {/* Desktop step wizard */}
        <div className="mb-8 hidden lg:flex items-center gap-0">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  currentStep > i
                    ? 'text-primary'
                    : currentStep === i
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                    currentStep > i
                      ? 'bg-primary/20 text-primary'
                      : currentStep === i
                        ? 'bg-white/30 text-white'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {currentStep > i ? '✓' : i + 1}
                </span>
                {step}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-8', currentStep > i ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        {importStatus === 'completed' ? (
          <div className="rounded-xl border border-border bg-card p-6 lg:max-w-xl">
            <ImportProgress
              status="completed"
              transactionCount={transactionCount}
              duplicatesSkipped={duplicatesSkipped}
            />
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Importar outro extrato
              </Button>
              <Button className="flex-1" onClick={() => (window.location.href = '/dashboard')}>
                Ver dashboard
              </Button>
            </div>
          </div>
        ) : (
          /* Desktop: dois painéis | Mobile: coluna única */
          <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
            {/* Coluna esquerda: form */}
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="bank-select"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Banco
                </label>
                <select
                  id="bank-select"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {BANK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <FileDropzone onFileSelect={setSelectedFile} disabled={isProcessing} />

              {importStatus && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <ImportProgress status={importStatus} errorMessage={errorMessage} />
                  {importStatus === 'failed' && (
                    <div className="mt-3 flex justify-center">
                      <Button variant="outline" size="sm" onClick={handleReset}>
                        Tentar novamente
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => handleImport()}
                disabled={!selectedFile || isProcessing || isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Enviando...' : 'Importar'}
              </Button>
            </div>

            {/* Coluna direita: instruções (desktop only) */}
            <div className="hidden lg:block space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">Bancos suportados</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong className="text-foreground">Nubank</strong> — CSV exportado do app
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong className="text-foreground">Itaú</strong> — OFX via internet banking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong className="text-foreground">Bradesco</strong> — CSV ou OFX
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Qualquer banco que exporte OFX
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">Como funciona</p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-primary">1.</span>
                    Selecione o banco e faça upload do extrato
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-primary">2.</span>
                    A IA categoriza automaticamente cada transação
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-bold text-primary">3.</span>
                    Visualize no dashboard em segundos
                  </li>
                </ol>
                <p className="mt-3 text-xs text-muted-foreground">
                  Transações duplicadas são detectadas e ignoradas automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={alreadyImportedDialog.open}
        onOpenChange={(open) =>
          setAlreadyImportedDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extrato já importado</DialogTitle>
            <DialogDescription>
              Este extrato já foi importado anteriormente. Todas as{' '}
              <strong>{alreadyImportedDialog.duplicatesSkipped}</strong> transações já existem
              na sua conta. Deseja importar mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAlreadyImportedDialog({ open: false, duplicatesSkipped: 0 });
                handleReset();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => handleImport(true)}>Importar mesmo assim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
