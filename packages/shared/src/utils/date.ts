/**
 * Format ISO date string to Indonesian locale.
 * @example formatDate("2026-05-17") → "17 Mei 2026"
 */
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Format ISO date string to short Indonesian locale.
 * @example formatDateShort("2026-05-17") → "17 Mei"
 */
export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Calculate days remaining until a target date.
 * Returns negative number if date has passed.
 */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate months remaining until a target date.
 */
export function monthsUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
}

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start and end date strings (YYYY-MM-DD) for a given period.
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'year' | 'all'): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const end = toLocalDateStr(now);

  switch (period) {
    case 'today':
      return { startDate: end, endDate: end };
    case 'week': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: toLocalDateStr(start), endDate: end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toLocalDateStr(start), endDate: end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: toLocalDateStr(start), endDate: end };
    }
    case 'all':
    default:
      return { startDate: '2000-01-01', endDate: end };
  }
}

/**
 * Get today's date as YYYY-MM-DD using local timezone.
 */
export function getLocalToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date string is today.
 */
export function isToday(dateStr: string): boolean {
  return dateStr.startsWith(getLocalToday());
}

/**
 * Check if a date string is yesterday.
 */
export function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr.startsWith(toLocalDateStr(yesterday));
}
