'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileDropzone } from '@/components/import/file-dropzone';
import { ImportProgress, type ImportStatus } from '@/components/import/import-progress';
import { Button } from '@/components/ui/button';
import { BANK_INSTRUCTIONS } from '@/lib/onboarding/bank-instructions';

const REALTIME_TIMEOUT_MS = 6000;
const POLL_INTERVAL_MS = 3000;

interface StepImportProps {
  onImportSuccess: () => void;
  onSkip: () => void;
}

export function StepImport({ onImportSuccess, onSkip }: StepImportProps) {
  const [openBankId, setOpenBankId] = useState<string | null>('nubank');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('Nubank');
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Sync bankName when accordion selection changes
  const handleBankToggle = (bankId: string, bankLabel: string) => {
    setOpenBankId((prev) => (prev === bankId ? null : bankId));
    setBankName(bankLabel);
    setSelectedFile(null);
    setImportStatus(null);
    setErrorMessage(undefined);
  };

  // Realtime subscription
  useEffect(() => {
    if (!importId) return;

    const channel = supabase
      .channel(`onboarding-import-${importId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'imports', filter: `id=eq.${importId}` },
        (payload) => {
          const newStatus = payload.new.status as ImportStatus;
          setImportStatus(newStatus);
          if (newStatus === 'completed') onImportSuccess();
          if (newStatus === 'failed') {
            setErrorMessage((payload.new.error_message as string) ?? 'Erro desconhecido');
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [importId, supabase, onImportSuccess]);

  // Polling fallback
  useEffect(() => {
    if (importStatus !== 'categorizing' || !importId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from('imports')
          .select('status, error_message')
          .eq('id', importId)
          .single();

        if (!data || data.status === 'categorizing') return;

        const resolved = data.status as ImportStatus;
        setImportStatus(resolved);
        if (resolved === 'completed') onImportSuccess();
        if (resolved === 'failed') setErrorMessage(data.error_message ?? 'Erro desconhecido');
        if (pollInterval) clearInterval(pollInterval);
      }, POLL_INTERVAL_MS);
    };

    const timeout = setTimeout(startPolling, REALTIME_TIMEOUT_MS);
    return () => { clearTimeout(timeout); if (pollInterval) clearInterval(pollInterval); };
  }, [importId, importStatus, supabase, onImportSuccess]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    setImportStatus('uploading');
    setErrorMessage(undefined);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bank_name', bankName);

    try {
      const response = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setImportStatus('failed');
        setErrorMessage(data.error ?? 'Erro ao processar arquivo');
        return;
      }

      setImportId(data.importId);
      setImportStatus(data.status as ImportStatus);
      if (data.status === 'completed') onImportSuccess();
    } catch {
      setImportStatus('failed');
      setErrorMessage('Erro de conexão. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFile, bankName, onImportSuccess]);

  const isProcessing =
    importStatus === 'uploading' ||
    importStatus === 'processing' ||
    importStatus === 'categorizing';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Importe seu extrato</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha seu banco para ver o passo a passo de como exportar o arquivo.
        </p>
      </div>

      {/* Bank accordion */}
      <div className="flex flex-col gap-2">
        {BANK_INSTRUCTIONS.map((bank) => {
          const isOpen = openBankId === bank.id;
          return (
            <div key={bank.id} className="overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => handleBankToggle(bank.id, bank.name)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{bank.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {bank.format}
                  </span>
                </div>
                <svg
                  className={['h-4 w-4 text-muted-foreground transition-transform', isOpen ? 'rotate-180' : ''].join(' ')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/20 px-4 py-4">
                  <ol className="flex flex-col gap-1.5 text-sm text-foreground">
                    {bank.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {bank.tip && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      💡 {bank.tip}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload area */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          Após exportar o arquivo do seu banco, faça o upload aqui:
        </p>

        {importStatus && importStatus !== 'failed' ? (
          <ImportProgress status={importStatus} />
        ) : (
          <>
            <FileDropzone onFileSelect={setSelectedFile} disabled={isProcessing} />
            {importStatus === 'failed' && (
              <div className="mt-3 rounded-lg bg-destructive/10 p-3">
                <ImportProgress status="failed" errorMessage={errorMessage} />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => { setImportStatus(null); setSelectedFile(null); }}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isProcessing || isSubmitting}
              className="mt-3 w-full"
            >
              {isSubmitting ? 'Enviando...' : 'Importar extrato'}
            </Button>
          </>
        )}
      </div>

      {/* Skip */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Pular por agora
        </button>
        <p className="text-xs text-muted-foreground">
          Você pode importar depois em &quot;Importar&quot; no menu
        </p>
      </div>
    </div>
  );
}
