'use client';

import { useState } from 'react';
import { Tag } from 'lucide-react';
import { CATEGORIES } from '@/lib/billing/plans';
import { CATEGORY_CONFIG, sanitizeCategory } from '@/lib/utils/categories';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CategorySelectorProps {
  currentCategory: string;
  onSelect: (category: string) => void;
  disabled?: boolean;
}

export function CategorySelector({ currentCategory, onSelect, disabled }: CategorySelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  function handleCustomSubmit() {
    const cat = sanitizeCategory(customValue);
    if (!cat) return;
    onSelect(cat);
    setShowCustomInput(false);
    setCustomValue('');
  }

  return (
    <div className="space-y-2">
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
              onClick={() => { onSelect(cat); setShowCustomInput(false); }}
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

        {/* Custom category button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCustomInput((v) => !v)}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors',
            showCustomInput || (!CATEGORIES.includes(currentCategory as never) && currentCategory)
              ? 'border-primary bg-primary/10'
              : 'border-dashed border-border bg-background hover:bg-accent',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <Tag className="h-5 w-5 text-violet-400" />
          <span className="text-[10px] leading-tight text-foreground">
            {!CATEGORIES.includes(currentCategory as never) && currentCategory
              ? currentCategory
              : 'Personalizada'}
          </span>
        </button>
      </div>

      {showCustomInput && (
        <div className="flex gap-2">
          <Input
            placeholder="Nome da categoria (ex: loja, pet)"
            maxLength={50}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            autoFocus
          />
          <Button type="button" size="sm" onClick={handleCustomSubmit} disabled={!customValue.trim()}>
            OK
          </Button>
        </div>
      )}
    </div>
  );
}
