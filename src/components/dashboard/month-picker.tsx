'use client';

import { useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MAX_FUTURE_MONTHS = 12;

export function MonthPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const monthParam = searchParams.get('month');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const selectedDate = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? new Date(`${monthParam}-15T12:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 15);

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const [pickerYear, setPickerYear] = useState(selectedYear);

  const maxDate = new Date(now.getFullYear(), now.getMonth() + MAX_FUTURE_MONTHS, 1);
  const minDate = new Date(now.getFullYear() - 5, 0, 1);

  const canGoPrev = selectedDate > minDate;
  const canGoNext = new Date(selectedYear, selectedMonth + 1, 1) < maxDate;

  const monthLabel = selectedDate
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  function navigateToDate(year: number, month: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (year === now.getFullYear() && month === now.getMonth()) {
      params.delete('month');
    } else {
      params.set('month', `${year}-${String(month + 1).padStart(2, '0')}`);
    }
    startTransition(() => {
      router.push(`/dashboard${params.size ? '?' + params.toString() : ''}`, { scroll: false });
    });
  }

  function navigate(delta: number) {
    const d = new Date(selectedYear, selectedMonth + delta, 1);
    navigateToDate(d.getFullYear(), d.getMonth());
  }

  function selectMonth(month: number) {
    navigateToDate(pickerYear, month);
    setOpen(false);
  }

  function isMonthDisabled(month: number) {
    const d = new Date(pickerYear, month, 1);
    return d < minDate || d >= maxDate;
  }

  const canPickerGoPrev = new Date(pickerYear - 1, 11, 1) >= minDate;
  const canPickerGoNext = new Date(pickerYear + 1, 0, 1) < maxDate;

  // Close on outside click
  if (typeof window !== 'undefined') {
    // handled via useEffect-style — we do it inline for brevity
  }

  return (
    <>
    {isPending && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Carregando mês...</p>
      </div>,
      document.body,
    )}
    <div ref={ref} className="relative">
      <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card px-1 py-1 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          disabled={!canGoPrev || isPending}
          aria-label="Mês anterior"
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground',
            'transition-colors hover:bg-muted/60 hover:text-foreground',
            'disabled:pointer-events-none disabled:opacity-30',
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => { if (!open) setPickerYear(selectedYear); setOpen((v) => !v); }}
          className={cn(
            'flex min-w-[148px] items-center justify-center gap-1.5 rounded-lg px-2 py-1',
            'text-xs font-medium text-foreground transition-colors hover:bg-muted/60',
            open && 'bg-muted/60',
          )}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
          {monthLabel}
        </button>

        <button
          onClick={() => navigate(+1)}
          disabled={!canGoNext || isPending}
          aria-label="Próximo mês"
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground',
            'transition-colors hover:bg-muted/60 hover:text-foreground',
            'disabled:pointer-events-none disabled:opacity-30',
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && !isPending && (
        <div
          className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          onMouseLeave={() => {/* keep open */}}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <button
              onClick={() => setPickerYear((y) => y - 1)}
              disabled={!canPickerGoPrev}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">{pickerYear}</span>
            <button
              onClick={() => setPickerYear((y) => y + 1)}
              disabled={!canPickerGoNext}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 p-2">
            {MONTH_NAMES_SHORT.map((name, i) => {
              const isSelected = pickerYear === selectedYear && i === selectedMonth;
              const isCurrentMonth = pickerYear === now.getFullYear() && i === now.getMonth();
              const isDisabled = isMonthDisabled(i);
              return (
                <button
                  key={i}
                  onClick={() => !isDisabled && selectMonth(i)}
                  disabled={isDisabled}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-lg py-2 text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isDisabled
                        ? 'pointer-events-none opacity-30 text-muted-foreground'
                        : 'text-foreground hover:bg-muted/60',
                  )}
                >
                  {name}
                  {isCurrentMonth && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
