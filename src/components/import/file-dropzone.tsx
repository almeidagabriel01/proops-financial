'use client';

import { useRef, useState } from 'react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelect, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);

  function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['ofx', 'csv'].includes(ext)) {
      setFormatError('Formato não suportado. Envie um arquivo .ofx ou .csv');
      setSelectedFile(null);
      return;
    }
    setFormatError(null);
    setSelectedFile(file);
    onFileSelect(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }

  function onDragLeave() {
    setIsDragOver(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={[
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".ofx,.csv"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
      />

      {formatError && (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {formatError}
        </p>
      )}

      {selectedFile ? (
        <div className="text-center">
          <div className="mb-2 text-2xl">📄</div>
          <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
          <p className="mt-2 text-xs text-primary">Clique para trocar o arquivo</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-3 text-3xl">📂</div>
          <p className="text-sm font-medium text-foreground">
            {isDragOver ? 'Solte o arquivo aqui' : 'Arraste e solte seu extrato'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">ou clique para selecionar</p>
          <p className="mt-3 text-xs text-muted-foreground">Formatos aceitos: .ofx, .csv — máximo 5MB</p>
        </div>
      )}
    </div>
  );
}
