import type React from 'react';

export const FIXED_EXPENSE_CATEGORIES = ['Comida', 'Transporte', 'Hospedaje'] as const;

export type FixedExpenseCategory = (typeof FIXED_EXPENSE_CATEGORIES)[number];

export function isTransportCategory(raw?: string): boolean {
  const lower = (raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return lower === 'transporte' || lower === 'peajes' || lower === 'transporte/peajes';
}

export function normalizeCategory(raw?: string): string {
  const cleaned = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, 50);
  if (!cleaned) return 'Otros';

  const lower = cleaned.toLowerCase();
  if (lower === 'comida') return 'Comida';
  if (lower === 'peajes' || lower === 'transporte/peajes' || lower === 'transporte') {
    return 'Transporte';
  }
  if (lower === 'hospedaje') return 'Hospedaje';
  if (lower === 'otros') return 'Otros';

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function isFixedCategory(raw?: string): boolean {
  const norm = normalizeCategory(raw);
  return (FIXED_EXPENSE_CATEGORIES as readonly string[]).includes(norm);
}

const ACCENT_DERIVED_TONES = [
  'var(--color-accent)',
  'color-mix(in srgb, var(--color-accent) 78%, #0ea5e9)',
  'color-mix(in srgb, var(--color-accent) 78%, #6366f1)',
  'color-mix(in srgb, var(--color-accent) 78%, #10b981)',
  'color-mix(in srgb, var(--color-accent) 78%, #f59e0b)',
  'color-mix(in srgb, var(--color-accent) 80%, #1e293b)'
];

function hashCategoryName(name: string): number {
  let hash = 5381;
  const normalized = name.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return Math.abs(hash);
}

export interface CategoryVisual {
  badgeClassName: string;
  badgeStyle?: React.CSSProperties;
  chartColor: string;
}

export function getCategoryVisual(rawCategory?: string): CategoryVisual {
  const category = normalizeCategory(rawCategory);

  if (category === 'Comida') {
    return {
      badgeClassName: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300',
      chartColor: '#FB923C'
    };
  }
  if (category === 'Transporte') {
    return {
      badgeClassName: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
      chartColor: '#3B82F6'
    };
  }
  if (category === 'Hospedaje') {
    return {
      badgeClassName: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
      chartColor: '#A855F7'
    };
  }

  const toneIndex = hashCategoryName(category) % ACCENT_DERIVED_TONES.length;
  const toneColor = ACCENT_DERIVED_TONES[toneIndex];

  return {
    badgeClassName: 'custom-category-badge',
    badgeStyle: { '--cat-tone': toneColor } as React.CSSProperties,
    chartColor: toneColor
  };
}
