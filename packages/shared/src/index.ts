/**
 * @karsafin/shared
 *
 * Shared business logic for the Karsafin financial management platform.
 * Used by both the Next.js web app and React Native (Expo) mobile app.
 */

// Main API
export { createKarsafinAPI, getSupabaseClient, resetSupabaseClient, workspaceContext } from './supabase';
export type { KarsafinAPI } from './supabase';

// Feature utilities (Kreasi User)
export { validateFeatureDefinition } from './feature/validator';
export { executeQuery, evaluateCondition, computeExpression } from './feature/interpreter';

// Types
export * from './types';

// Sync Engine (Offline + Auto-Sync)
export { SyncEngine, createConflictResolver, setConnectivityDetector, getConnectivityDetector, isOnline } from './sync';
export type { ConnectivityDetector } from './sync';
export type { LocalDatabase, SyncStatus, SyncQueueItem, SyncConflict, SyncState, SyncProgress, SyncTable, SyncEventMap } from './sync';
export { SYNC_TABLES } from './sync';

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
