import type { SyncTable, SyncQueueItem, SyncConflict, SyncStatus } from './types';

export interface LocalDatabase {
  init(): Promise<void>;
  close(): Promise<void>;

  find(table: SyncTable, id: string): Promise<Record<string, any> | null>;
  findAll(table: SyncTable, query?: Record<string, any>): Promise<Record<string, any>[]>;
  insert(table: SyncTable, record: Record<string, any>): Promise<void>;
  update(table: SyncTable, id: string, changes: Record<string, any>): Promise<void>;
  delete(table: SyncTable, id: string): Promise<void>;
  getPendingRecords(table: SyncTable): Promise<Record<string, any>[]>;

  getSyncStatus(table: SyncTable, id: string): Promise<SyncStatus | null>;
  setSyncStatus(table: SyncTable, id: string, status: SyncStatus, serverUpdatedAt?: string): Promise<void>;

  enqueue(item: Omit<SyncQueueItem, 'created_at' | 'retry_count' | 'status'>): Promise<void>;
  dequeue(): Promise<SyncQueueItem | null>;
  peek(): Promise<SyncQueueItem | null>;
  getQueueLength(): Promise<number>;
  markQueueItemFailed(id: string, error: string): Promise<void>;
  markQueueItemDone(id: string): Promise<void>;
  getFailedItems(): Promise<SyncQueueItem[]>;

  addConflict(conflict: Omit<SyncConflict, 'id' | 'created_at' | 'resolved'>): Promise<void>;
  getConflicts(table?: SyncTable): Promise<SyncConflict[]>;
  resolveConflict(id: string, resolution: SyncConflict['resolution']): Promise<void>;

  getLastSyncTime(table?: SyncTable): Promise<string | null>;
  setLastSyncTime(table: SyncTable, time: string): Promise<void>;

  getPendingChangesCount(): Promise<number>;
}
