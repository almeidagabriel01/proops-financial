'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseDate(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  min,
  max,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const now = new Date();

  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? now.getMonth());

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const minDate = parseDate(min ?? '');
  const maxDate = parseDate(max ?? '');

  function isDayDisabled(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day);
    if (minDate) {
      const minMidnight = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (d < minMidnight) return true;
    }
    if (maxDate) {
      const maxMidnight = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      if (d > maxMidnight) return true;
    }
    return false;
  }

  function handleOpen() {
    if (!open && selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
    setOpen((v) => !v);
  }

  function handleSelectDay(day: number) {
    onChange(toYMD(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  }

  function navigate(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  // Build day grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayYMD = toYMD(now);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center gap-2.5 rounded-xl border border-input bg-background',
          'px-3 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          'hover:border-ring/50',
          !value ? 'text-muted-foreground' : 'text-foreground',
          disabled && 'cursor-not-allowed opacity-50',
          open && 'border-ring ring-2 ring-ring/20',
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">
          {selectedDate ? formatDisplay(selectedDate) : placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Month/year header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar */}
          <div className="p-3">
            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="h-9" />;
                const ymd = toYMD(new Date(viewYear, viewMonth, day));
                const isSelected = value === ymd;
                const isToday = todayYMD === ymd;
                const isDisabled = isDayDisabled(day);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !isDisabled && handleSelectDay(day)}
                    disabled={isDisabled}
                    className={cn(
                      'relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isDisabled
                          ? 'cursor-not-allowed text-muted-foreground/30'
                          : 'text-foreground hover:bg-muted/70 active:bg-muted',
                    )}
                  >
                    {day}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
