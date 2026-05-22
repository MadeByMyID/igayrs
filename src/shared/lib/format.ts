import type { Language } from '@/shared/types';

export function formatLocalDateTime24(isoString: unknown): string {
  if (!isoString) return '-';
  const date = new Date(String(isoString));
  if (Number.isNaN(date.getTime())) return '-';
  const datePart = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit'
  }).format(date);
  return `${datePart} ${timePart}`;
}

export function formatCount(value: unknown, lang: Language): string {
  return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(Number(value) || 0);
}
