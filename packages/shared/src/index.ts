/**
 * @karsafin/shared
 *
 * Shared business logic for the Karsafin financial management platform.
 * Used by both the Next.js web app and React Native (Expo) mobile app.
 */

// Main API
export { createKarsafinAPI, getSupabaseClient, resetSupabaseClient, workspaceContext } from './supabase';
export type { KarsafinAPI } from './supabase';

// Types
export * from './types';

// Utilities
export {
  formatCurrency,
  formatCurrencyCompact,
  parseAmount,
  formatDate,
  formatDateShort,
  daysUntil,
  monthsUntil,
  getDateRange,
  getLocalToday,
  isToday,
  isYesterday,
  getMonthlyRange,
  getFundingMonth,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  DEFAULT_CATEGORIES,
  ICON_OPTIONS,
  COLOR_OPTIONS,
  ACCOUNT_TYPE_LABELS,
  MIDTRANS_CLIENT_KEY,
  MIDTRANS_SNAP_URL,
} from './utils';
