'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MAX_FUTURE_MONTHS = 3;

interface MonthPickerFilterProps {
  /** Valor no formato YYYY-MM */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MonthPickerFilter({ value, onChange, className }: MonthPickerFilterProps) {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const selectedDate = value && /^\d{4}-\d{2}$/.test(value)
    ? new Date(`${value}-15T12:00:00`)
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

  function toYM(year: number, month: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  function navigate(delta: number) {
    const d = new Date(selectedYear, selectedMonth + delta, 1);
    onChange(toYM(d.getFullYear(), d.getMonth()));
  }

  function selectMonth(month: number) {
    onChange(toYM(pickerYear, month));
    setOpen(false);
  }

  function isMonthDisabled(month: number) {
    const d = new Date(pickerYear, month, 1);
    return d < minDate || d >= maxDate;
  }

  const canPickerGoPrev = new Date(pickerYear - 1, 11, 1) >= minDate;
  const canPickerGoNext = new Date(pickerYear + 1, 0, 1) < maxDate;

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card px-1 py-1 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={!canGoPrev}
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
          type="button"
          onClick={() => { if (!open) setPickerYear(selectedYear); setOpen((v) => !v); }}
          className={cn(
            'flex min-w-[148px] items-center justify-center gap-1.5 rounded-lg px-2 py-1',
            'text-xs font-medium text-foreground transition-colors hover:bg-muted/60',
            open && 'bg-muted/60',
          )}
        >
          <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
          {monthLabel}
        </button>

        <button
          type="button"
          onClick={() => navigate(+1)}
          disabled={!canGoNext}
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

      {open && (
        <>
          {/* Backdrop para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute left-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                disabled={!canPickerGoPrev}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-foreground">{pickerYear}</span>
              <button
                type="button"
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
                    type="button"
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
        </>
      )}
    </div>
  );
}
