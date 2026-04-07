'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileDropzone } from '@/components/import/file-dropzone';
import { ImportProgress, type ImportStatus } from '@/components/import/import-progress';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/use-plan';
import { PaywallModal } from '@/components/layout/paywall-modal';

const BANK_OPTIONS = [
  { value: 'Nubank', label: 'Nubank' },
  { value: 'Itaú', label: 'Itaú' },
  { value: 'Bradesco', label: 'Bradesco' },
  { value: 'Outro', label: 'Outro' },
];

// Polling fallback: starts after this delay if Realtime hasn't fired
const REALTIME_TIMEOUT_MS = 6000;
const POLL_INTERVAL_MS = 3000;

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

  const { isBasic, maxBankAccounts } = usePlan();

  // Stable client ref — prevents useEffect dependency churn on re-renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

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
          console.log('[import] Realtime event received:', payload.new);
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
      .subscribe((status) => {
        console.log('[import] Realtime channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [importId, supabase]);

  // Polling fallback: if Realtime doesn't fire within REALTIME_TIMEOUT_MS,
  // poll the DB every POLL_INTERVAL_MS until status leaves 'categorizing'
  useEffect(() => {
    if (importStatus !== 'categorizing' || !importId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      console.log('[import] Realtime timeout — starting polling fallback');
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

        console.log('[import] Polling resolved status:', data.status);
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
      }, POLL_INTERVAL_MS);
    };

    const timeout = setTimeout(startPolling, REALTIME_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [importId, importStatus, supabase]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    // AC4: Enforce bank account limit for Basic plan
    if (isBasic) {
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

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bank_name', bankName);

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
    <div className="mx-auto max-w-screen-sm px-4 py-6">
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="accounts"
      />
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Importar Extrato</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie o extrato do seu banco em formato OFX ou CSV
        </p>
      </div>

      {importStatus === 'completed' ? (
        <div className="rounded-xl border border-border bg-card p-6">
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
        <div className="flex flex-col gap-4">
          {/* Bank selector */}
          <div>
            <label htmlFor="bank-select" className="mb-1.5 block text-sm font-medium text-foreground">
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

          {/* File dropzone */}
          <FileDropzone onFileSelect={setSelectedFile} disabled={isProcessing} />

          {/* Progress indicator */}
          {importStatus && (
            <div className="rounded-xl border border-border bg-card p-4">
              <ImportProgress
                status={importStatus}
                errorMessage={errorMessage}
              />
              {importStatus === 'failed' && (
                <div className="mt-3 flex justify-center">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Import button */}
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isProcessing || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Enviando...' : 'Importar'}
          </Button>
        </div>
      )}
    </div>
  );
}
