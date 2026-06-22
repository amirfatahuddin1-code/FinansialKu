export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete' | 'conflict';

export interface SyncMetadata {
  sync_status: SyncStatus;
  local_updated_at: string;
  server_updated_at?: string;
}

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  created_at: string;
  retry_count: number;
  last_error?: string;
  status?: 'pending' | 'processing';
}

export interface SyncConflict {
  id: string;
  table_name: string;
  record_id: string;
  local_data: Record<string, any>;
  server_data: Record<string, any>;
  created_at: string;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'manual';
}

export interface SyncProgress {
  phase: 'idle' | 'pushing' | 'pulling' | 'resolving';
  current: number;
  total: number;
  table?: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingChanges: number;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  progress: SyncProgress;
  lastError?: string;
}

export interface SyncEventMap {
  'sync:start': [];
  'sync:complete': [date: Date];
  'sync:error': [error: string];
  'sync:progress': [progress: SyncProgress];
  'online': [];
  'offline': [];
  'pending:change': [count: number];
}

export type SyncTable =
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'savings'
  | 'debts'
  | 'debt_payments'
  | 'financial_accounts'
  | 'events'
  | 'event_items'
  | 'event_incomes'
  | 'shopping_plans';

export const SYNC_TABLES: SyncTable[] = [
  'transactions',
  'categories',
  'budgets',
  'savings',
  'debts',
  'debt_payments',
  'financial_accounts',
  'events',
  'event_items',
  'event_incomes',
  'shopping_plans',
];
