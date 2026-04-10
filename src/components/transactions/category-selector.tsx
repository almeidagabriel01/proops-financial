'use client';

import { useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { CATEGORIES } from '@/lib/billing/plans';
import { CATEGORY_CONFIG, sanitizeCategory } from '@/lib/utils/categories';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/billing/plans';

interface CategorySelectorProps {
  currentCategory: string;
  onSelect: (category: string) => void;
  disabled?: boolean;
}

/**
 * Combobox de categorias com busca e criação de categorias personalizadas.
 * - Digitar filtra as categorias padrão em tempo real
 * - Enter seleciona o primeiro resultado ou cria nova categoria se não houver match
 * - Botão "+" cria a categoria digitada
 */
export function CategorySelector({ currentCategory, onSelect, disabled }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustom = currentCategory && !CATEGORIES.includes(currentCategory as Category);
  const currentConfig = CATEGORY_CONFIG[currentCategory as Category];
  const CurrentIcon = currentConfig?.icon;
  const displayLabel = isCustom
    ? currentCategory
    : (currentConfig?.label ?? currentCategory);

  const filtered = CATEGORIES.filter((cat) =>
    CATEGORY_CONFIG[cat].label.toLowerCase().includes(query.toLowerCase()),
  );

  // Mostra opção de criar se a query não corresponde exatamente a nenhuma categoria
  const showCreateOption =
    query.trim().length > 0 &&
    !CATEGORIES.some(
      (cat) => CATEGORY_CONFIG[cat].label.toLowerCase() === query.trim().toLowerCase(),
    );

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    // Foca o input após o render
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeDropdown() {
    setOpen(false);
    setQuery('');
  }

  function handleSelect(cat: string) {
    onSelect(cat);
    closeDropdown();
  }

  function handleCreate() {
    const sanitized = sanitizeCategory(query.trim());
    if (!sanitized) return;
    onSelect(sanitized);
    closeDropdown();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      closeDropdown();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (filtered.length > 0) {
        handleSelect(filtered[0]);
      } else if (showCreateOption) {
        handleCreate();
      }
    }
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {CurrentIcon && (
          <CurrentIcon
            className="h-4 w-4 shrink-0"
            style={{ color: isCustom ? undefined : currentConfig?.color }}
          />
        )}
        <span className="flex-1 truncate text-left text-foreground">
          {displayLabel || 'Selecione uma categoria...'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop invisível para fechar ao clicar fora */}
          <div className="fixed inset-0 z-10" onClick={closeDropdown} />

          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            {/* Campo de busca */}
            <div className="border-b border-border p-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar categoria..."
                className="h-8 w-full bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Lista de opções */}
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                const isActive = cat === currentCategory;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'hover:bg-accent hover:text-accent-foreground',
                      )}
                      onClick={() => handleSelect(cat)}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: isActive ? undefined : config.color }}
                      />
                      {config.label}
                    </button>
                  </li>
                );
              })}

              {filtered.length === 0 && !query && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Sem categorias disponíveis
                </li>
              )}

              {filtered.length === 0 && query && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhuma categoria encontrada
                </li>
              )}

              {/* Opção de criar categoria personalizada */}
              {showCreateOption && (
                <li className="border-t border-border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-primary transition-colors hover:bg-accent"
                    onClick={handleCreate}
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    Criar &ldquo;{query.trim()}&rdquo;
                  </button>
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
