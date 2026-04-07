'use client';

import { CATEGORIES } from '@/lib/billing/plans';
import type { Category } from '@/lib/billing/plans';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  currentCategory: string;
  onSelect: (category: Category) => void;
  disabled?: boolean;
}

export function CategorySelector({ currentCategory, onSelect, disabled }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {CATEGORIES.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const isActive = cat === currentCategory;
        const Icon = config.icon;

        return (
          <button
            key={cat}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(cat)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors',
              isActive
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background hover:bg-accent',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            aria-pressed={isActive}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: isActive ? undefined : config.color }}
            />
            <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold text-primary' : 'text-foreground')}>
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
