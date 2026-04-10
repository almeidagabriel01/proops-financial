'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Tag, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CategorySelector } from '@/components/transactions/category-selector';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { saveCorrection, findSameDescriptionIds } from '@/lib/ai/category-correction';
import { createClient } from '@/lib/supabase/client';
import type { TransactionWithTags } from '@/hooks/use-transactions';
import type { Category } from '@/lib/billing/plans';

type DetailMode = 'view' | 'selecting' | 'confirming' | 'saving';
type NoteSaveState = 'idle' | 'saving' | 'saved';

interface TransactionDetailProps {
  transaction: TransactionWithTags | null;
  open: boolean;
  onClose: () => void;
  onCategoryUpdated: (transactionId: string, newCategory: string) => void;
  onTagsUpdated?: (tags: string[]) => void;
}

export function TransactionDetail({
  transaction: tx,
  open,
  onClose,
  onCategoryUpdated,
  onTagsUpdated,
}: TransactionDetailProps) {
  const [mode, setMode] = useState<DetailMode>('view');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sameIds, setSameIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Note state
  const [noteValue, setNoteValue] = useState(tx?.notes ?? '');
  const [savedNote, setSavedNote] = useState(tx?.notes ?? '');
  const [noteSaveState, setNoteSaveState] = useState<NoteSaveState>('idle');

  // Tags state
  const [tags, setTags] = useState<string[]>((tx?.transaction_tags ?? []).map((t) => t.tag));
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const tagDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const supabase = createClient();

  function resetState() {
    setMode('view');
    setSelectedCategory(null);
    setSameIds([]);
    setSaveError(null);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && mode !== 'saving') {
      onClose();
      setTimeout(resetState, 300);
    }
  }

  // Reset all state when a new transaction opens
  function handleSheetOpen(isOpen: boolean) {
    if (isOpen && tx) {
      setNoteValue(tx.notes ?? '');
      setSavedNote(tx.notes ?? '');
      setNoteSaveState('idle');
      setTags((tx.transaction_tags ?? []).map((t) => t.tag));
      setTagInput('');
      setSuggestions([]);
    }
    handleOpenChange(isOpen);
  }

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (!tx) return;
    clearTimeout(tagDebounceRef.current);
    if (!tagInput.trim()) {
      setSuggestions([]);
      return;
    }
    tagDebounceRef.current = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(
          `/api/tags/autocomplete?q=${encodeURIComponent(tagInput.trim().toLowerCase())}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { suggestions: string[] };
          // Filter out tags already on this transaction
          setSuggestions(data.suggestions.filter((s) => !tags.includes(s)));
        }
      } catch {
        // Silently ignore autocomplete errors
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(tagDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagInput, tx?.id]);

  // ── Note save on blur ────────────────────────────────────────────────────────
  async function handleNoteBlur() {
    if (!tx) return;
    const trimmed = noteValue.trim();
    const normalizedSaved = savedNote.trim();
    if (trimmed === normalizedSaved) return;

    setNoteSaveState('saving');
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmed === '' ? null : trimmed }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Erro ao salvar nota');
      }

      setSavedNote(trimmed);
      setNoteValue(trimmed);
      setNoteSaveState('saved');
      setTimeout(() => setNoteSaveState('idle'), 1500);
    } catch (err) {
      console.error('[transaction-detail] note save error:', err);
      setNoteValue(savedNote);
      setNoteSaveState('idle');
      toast.error('Erro ao salvar nota — tente novamente');
    }
  }

  // ── Add tag ──────────────────────────────────────────────────────────────────
  async function handleAddTag(rawTag: string) {
    if (!tx) return;
    const tag = rawTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag) return;
    if (tag.length > 50) {
      toast.error('Tag muito longa (máximo 50 caracteres)');
      return;
    }
    if (tags.includes(tag)) {
      setTagInput('');
      setSuggestions([]);
      return;
    }

    // Optimistic update
    const newTags = [...tags, tag];
    setTags(newTags);
    setTagInput('');
    setSuggestions([]);
    onTagsUpdated?.(newTags);

    try {
      const res = await fetch(`/api/transactions/${tx.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Erro ao adicionar tag');
      }
    } catch (err) {
      console.error('[transaction-detail] add tag error:', err);
      // Rollback
      const rolledBack = tags.filter((t) => t !== tag);
      setTags(rolledBack);
      onTagsUpdated?.(rolledBack);
      toast.error('Erro ao adicionar tag — tente novamente');
    }
  }

  // ── Remove tag ───────────────────────────────────────────────────────────────
  async function handleRemoveTag(tag: string) {
    if (!tx) return;

    // Optimistic update
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    onTagsUpdated?.(newTags);

    try {
      const res = await fetch(
        `/api/transactions/${tx.id}/tags/${encodeURIComponent(tag)}`,
        { method: 'DELETE' },
      );
      if (!res.ok && res.status !== 404) {
        throw new Error('Erro ao remover tag');
      }
    } catch (err) {
      console.error('[transaction-detail] remove tag error:', err);
      // Rollback
      const rolledBack = [...tags];
      setTags(rolledBack);
      onTagsUpdated?.(rolledBack);
      toast.error('Erro ao remover tag — tente novamente');
    }
  }

  // ── Tag input keyboard handler ───────────────────────────────────────────────
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      void handleAddTag(tagInput);
    }
  }

  // ── Category selection → check duplicates ────────────────────────────────────
  function handleCategorySelect(category: string) {
    if (!tx) return;
    setSelectedCategory(category);
    setSaveError(null);
    setMode('saving');

    findSameDescriptionIds(supabase, tx.user_id, tx.description, tx.id)
      .then((ids) => {
        setSameIds(ids);
        if (ids.length > 0) {
          setMode('confirming');
        } else {
          return doSave(category, [tx.id]);
        }
      })
      .catch((err: unknown) => {
        console.error('[transaction-detail] duplicate search error:', err);
        setSaveError('Erro ao verificar duplicatas. Tente novamente.');
        setMode('selecting');
      });
  }

  // ── Persist correction (single or batch) ─────────────────────────────────────
  function doSave(category: string, transactionIds: string[]) {
    if (!tx) return Promise.resolve();
    setMode('saving');

    return saveCorrection(supabase, {
      userId: tx.user_id,
      transactionIds,
      description: tx.description,
      newCategory: category,
    })
      .then(() => {
        onCategoryUpdated(tx.id, category);
        toast.success(
          transactionIds.length > 1
            ? `${transactionIds.length} transações atualizadas`
            : 'Categoria atualizada',
        );
        onClose();
        setTimeout(resetState, 300);
      })
      .catch((err: unknown) => {
        console.error('[transaction-detail] save error:', err);
        setSaveError('Erro ao salvar. Tente novamente.');
        setMode(sameIds.length > 0 ? 'confirming' : 'selecting');
      });
  }

  function handleConfirmSingle() {
    if (!tx || !selectedCategory) return;
    void doSave(selectedCategory, [tx.id]);
  }

  function handleConfirmBatch() {
    if (!tx || !selectedCategory) return;
    void doSave(selectedCategory, [tx.id, ...sameIds]);
  }

  if (!tx) return null;

  const categoryKey = (tx.category ?? 'outros') as Category;
  const currentConfig = CATEGORY_CONFIG[categoryKey] ?? CATEGORY_CONFIG.outros;
  const CurrentIcon = currentConfig.icon;
  const isCredit = tx.type === 'credit';

  return (
    <Sheet open={open} onOpenChange={handleSheetOpen}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-4 pt-2">
          <SheetTitle>
            {mode === 'selecting'
              ? 'Escolha uma categoria'
              : mode === 'confirming'
                ? 'Corrigir categoria'
                : 'Detalhe da transação'}
          </SheetTitle>
        </SheetHeader>

        {/* ── VIEW: transaction detail ─────────────────────────────────── */}
        {mode === 'view' && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{tx.description}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatDate(tx.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isCredit ? '+' : '-'}
                    {formatCurrency(Math.abs(tx.amount))}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categoria</p>
                <div className="mt-1 flex items-center gap-2">
                  <CurrentIcon className="h-4 w-4" style={{ color: currentConfig.color }} />
                  <span className="text-sm font-medium text-foreground">{currentConfig.label}</span>
                </div>
              </div>
            </div>

            {/* ── Tags ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Tags</span>
              </div>

              {/* Existing tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 px-2 py-0.5 text-xs font-normal"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => void handleRemoveTag(tag)}
                        aria-label={`Remover tag ${tag}`}
                        className="ml-0.5 rounded-full hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Tag input with autocomplete */}
              <div className="relative">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                  placeholder="Adicionar tag (Enter ou vírgula)..."
                  className="h-8 text-sm"
                  maxLength={50}
                />
                {isFetchingSuggestions && (
                  <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {suggestions.length > 0 && (
                  <div className="mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent blur before click
                          void handleAddTag(s);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Nota ───────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="transaction-note" className="text-xs font-medium text-muted-foreground">
                  {noteValue ? 'Nota' : 'Adicionar nota'}
                </label>
                {noteSaveState === 'saving' && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                {noteSaveState === 'saved' && (
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <Textarea
                id="transaction-note"
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                onBlur={() => void handleNoteBlur()}
                maxLength={500}
                placeholder="Ex: reembolso, presente, motivo específico..."
                className="min-h-[72px] resize-none text-sm"
              />
              {noteValue.length > 450 && (
                <p className="text-right text-[10px] text-muted-foreground">
                  {noteValue.length}/500
                </p>
              )}
            </div>

            <Button className="w-full" onClick={() => setMode('selecting')}>
              Corrigir categoria
            </Button>
          </div>
        )}

        {/* ── SELECTING: category grid ──────────────────────────────────── */}
        {mode === 'selecting' && (
          <div className="space-y-4">
            {saveError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </p>
            )}
            <CategorySelector
              currentCategory={tx.category ?? 'outros'}
              onSelect={handleCategorySelect}
            />
            <Button variant="ghost" className="w-full" onClick={() => setMode('view')}>
              Cancelar
            </Button>
          </div>
        )}

        {/* ── CONFIRMING: single vs batch choice ───────────────────────── */}
        {mode === 'confirming' && selectedCategory && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Encontramos{' '}
              <strong className="text-foreground">{sameIds.length + 1} transações</strong> com a
              descrição{' '}
              <strong className="text-foreground">&quot;{tx.description}&quot;</strong>.
            </p>

            {saveError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </p>
            )}

            <Button className="w-full" onClick={handleConfirmBatch}>
              Corrigir todas ({sameIds.length + 1} transações)
            </Button>
            <Button variant="outline" className="w-full" onClick={handleConfirmSingle}>
              Corrigir só esta
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setMode('selecting')}>
              Voltar
            </Button>
          </div>
        )}

        {/* ── SAVING: loading spinner ───────────────────────────────────── */}
        {mode === 'saving' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Salvando...</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
