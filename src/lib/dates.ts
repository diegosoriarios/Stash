import type { Urgency } from '@/lib/types';

export const EXPIRING_SOON_DAYS = 7;

/** Local-calendar ISO date (YYYY-MM-DD). Avoids UTC shifts from toISOString(). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parses a YYYY-MM-DD string as a local-midnight Date. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Whole calendar days from today until the given ISO date. Negative = expired. */
export function daysUntilExpiry(iso: string, from: Date = new Date()): number {
  const target = parseISODate(iso);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function urgencyOf(iso: string): Urgency {
  const days = daysUntilExpiry(iso);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_SOON_DAYS) return 'soon';
  return 'ok';
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'Not set';
  return parseISODate(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function expiryLabel(iso: string): string {
  const days = daysUntilExpiry(iso);
  if (days < 0) return `Expired ${-days} day${days === -1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}
