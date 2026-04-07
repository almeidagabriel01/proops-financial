// Central CATEGORY_CONFIG — shared between Story 2.2 (correction UI) and 2.3 (dashboard charts)
// Icons: Lucide React | Labels: PT-BR | Colors: consistent across all charts and selectors

import {
  Utensils, Package, Car, Home, Heart, BookOpen, Music, ShoppingBag,
  Repeat, ArrowLeftRight, Banknote, TrendingUp, Receipt, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Category } from '@/lib/billing/plans';

export interface CategoryConfig {
  icon: LucideIcon;
  label: string;
  color: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  alimentacao:    { icon: Utensils,       label: 'Alimentação',    color: '#22c55e' },
  delivery:       { icon: Package,        label: 'Delivery',       color: '#f97316' },
  transporte:     { icon: Car,            label: 'Transporte',     color: '#3b82f6' },
  moradia:        { icon: Home,           label: 'Moradia',        color: '#8b5cf6' },
  saude:          { icon: Heart,          label: 'Saúde',          color: '#ec4899' },
  educacao:       { icon: BookOpen,       label: 'Educação',       color: '#14b8a6' },
  lazer:          { icon: Music,          label: 'Lazer',          color: '#eab308' },
  compras:        { icon: ShoppingBag,    label: 'Compras',        color: '#f43f5e' },
  assinaturas:    { icon: Repeat,         label: 'Assinaturas',    color: '#6366f1' },
  transferencias: { icon: ArrowLeftRight, label: 'Transferências', color: '#64748b' },
  salario:        { icon: Banknote,       label: 'Salário',        color: '#10b981' },
  investimentos:  { icon: TrendingUp,     label: 'Investimentos',  color: '#0ea5e9' },
  impostos:       { icon: Receipt,        label: 'Impostos',       color: '#78716c' },
  outros:         { icon: MoreHorizontal, label: 'Outros',         color: '#9ca3af' },
};
