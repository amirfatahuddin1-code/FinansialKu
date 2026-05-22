/**
 * Format number as Indonesian Rupiah currency string.
 * @example formatCurrency(150000) → "150.000"
 */
export function formatCurrency(amount: number): string {
  return Math.abs(amount).toLocaleString('id-ID');
}

/**
 * Format number as compact Indonesian currency (e.g. 1.5jt, 500rb).
 * @example formatCurrencyCompact(1500000) → "1.5jt"
 */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (abs >= 1_000_000) {
    return (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  }
  if (abs >= 1_000) {
    return (abs / 1_000).toFixed(0) + 'rb';
  }
  return abs.toLocaleString('id-ID');
}

/**
 * Parse formatted Indonesian currency string back to number.
 * Handles dots as thousand separator and strips "Rp" prefix.
 * @example parseAmount("Rp 1.500.000") → 1500000
 */
export function parseAmount(value: string): number {
  if (!value) return 0;
  let s = value.replace(/[Rr]p\.?\s*/g, '').trim();

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    return parseFloat(s) || 0;
  }

  if (lastDot >= 0 && lastComma >= 0) {
    // Both separators: the last one is decimal
    if (lastComma > lastDot) {
      // Comma is decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal
      s = s.replace(/,/g, '');
      const idx = s.lastIndexOf('.');
      s = s.slice(0, idx).replace(/\./g, '') + '.' + s.slice(idx + 1);
    }
  } else {
    // Only one separator type
    const sep = lastDot >= 0 ? '.' : ',';
    const idx = s.lastIndexOf(sep);
    const after = s.slice(idx + 1);
    // If 1-2 digits after separator → treat as decimal
    if (after.length >= 1 && after.length <= 2) {
      s = s.replace(new RegExp('\\' + sep, 'g'), (m, i) =>
        i === idx ? '.' : ''
      );
    } else {
      // Thousand separator → remove all
      s = s.replace(new RegExp('\\' + sep, 'g'), '');
    }
  }

  return parseFloat(s) || 0;
}
