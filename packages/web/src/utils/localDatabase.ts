import Dexie, { type Table } from 'dexie';
import type { LocalDatabase, SyncTable, SyncQueueItem, SyncConflict, SyncStatus } from '@karsafin/shared';
import { SYNC_TABLES } from '@karsafin/shared';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

class KarsafinDB extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  syncConflicts!: Table<SyncConflict>;
  syncMetadata!: Table<{ key: string; value: string }>;
  dataTables: Map<string, Table<any, string>> = new Map();

  constructor() {
    super('karsafin_offline');

    const tableSchemas: string[] = [];

    for (const table of SYNC_TABLES) {
      tableSchemas.push(`${table}: id`);
    }

    this.version(1).stores({
      syncQueue: '++id, table_name, record_id, status, created_at',
      syncConflicts: '++id, table_name, record_id, resolved',
      syncMetadata: 'key',
      ...Object.fromEntries(SYNC_TABLES.map(t => [t, 'id'])),
    });

    for (const table of SYNC_TABLES) {
      this.dataTables.set(table, this.table(table));
    }
  }
}

let dbInstance: KarsafinDB | null = null;

export function createWebDatabase(): LocalDatabase {
  if (!dbInstance) dbInstance = new KarsafinDB();

  const db = dbInstance;

  return {
    async init() {
      await db.open();
    },

    async close() {
      db.close();
    },

    async find(table: SyncTable, id: string) {
      const t = db.dataTables.get(table);
      if (!t) return null;
      return (await t.get(id)) || null;
    },

    async findAll(table: SyncTable, query?: Record<string, any>) {
      const t = db.dataTables.get(table);
      if (!t) return [];
      let collection = t.toCollection();
      if (query) {
        for (const [key, value] of Object.entries(query)) {
          collection = collection.filter(item => item[key] === value);
        }
      }
      return collection.toArray();
    },

    async insert(table: SyncTable, record: Record<string, any>) {
      const t = db.dataTables.get(table);
      if (!t) return;
      const data = { ...record, _sync_status: 'synced' as SyncStatus, _local_updated_at: new Date().toISOString() };
      await t.put(data);
    },

    async update(table: SyncTable, id: string, changes: Record<string, any>) {
      const t = db.dataTables.get(table);
      if (!t) return;
      await t.update(id, { ...changes, _local_updated_at: new Date().toISOString() });
    },

    async delete(table: SyncTable, id: string) {
      const t = db.dataTables.get(table);
      if (!t) return;
      await t.delete(id);
    },

    async getPendingRecords(table: SyncTable) {
      const t = db.dataTables.get(table);
      if (!t) return [];
      return t
        .filter(r => ['pending_create', 'pending_update', 'pending_delete'].includes(r._sync_status))
        .toArray();
    },

    async getSyncStatus(table: SyncTable, id: string): Promise<SyncStatus | null> {
      const t = db.dataTables.get(table);
      if (!t) return null;
      const record = await t.get(id);
      return record?._sync_status || null;
    },

    async setSyncStatus(table: SyncTable, id: string, status: SyncStatus, serverUpdatedAt?: string) {
      const t = db.dataTables.get(table);
      if (!t) return;
      const update: any = { _sync_status: status, _local_updated_at: new Date().toISOString() };
      if (serverUpdatedAt) update._server_updated_at = serverUpdatedAt;
      await t.update(id, update);
    },

    async enqueue(item: Omit<SyncQueueItem, 'created_at' | 'retry_count' | 'status'>) {
      await db.syncQueue.add({
        ...item,
        id: item.id || generateId(),
        created_at: new Date().toISOString(),
        retry_count: 0,
        status: 'pending',
      } as SyncQueueItem);
    },

    async dequeue() {
      const first = await db.syncQueue
        .where('status')
        .equals('pending' as any)
        .first();
      if (first) {
        await db.syncQueue.update(first.id!, { status: 'processing' } as any);
        return first;
      }
      return null;
    },

    async peek() {
      return (await db.syncQueue.where('status').equals('pending' as any).first()) || null;
    },

    async getQueueLength() {
      return db.syncQueue.where('status').equals('pending' as any).count();
    },

    async markQueueItemFailed(id: string, error: string) {
      const item = await db.syncQueue.get(id);
      if (!item) return;
      await db.syncQueue.update(id, {
        retry_count: (item.retry_count || 0) + 1,
        last_error: error,
        status: 'pending',
      } as any);
    },

    async markQueueItemDone(id: string) {
      await db.syncQueue.delete(id);
    },

    async getFailedItems() {
      return db.syncQueue
        .filter(item => (item.retry_count || 0) > 3)
        .toArray();
    },

    async addConflict(conflict: Omit<SyncConflict, 'id' | 'created_at' | 'resolved'>) {
      await db.syncConflicts.add({
        ...conflict,
        id: generateId(),
        created_at: new Date().toISOString(),
        resolved: false,
      } as SyncConflict);
    },

    async getConflicts(table?: SyncTable) {
      let collection = db.syncConflicts.where('resolved').equals(0);
      if (table) collection = collection.filter(c => c.table_name === table);
      return collection.toArray();
    },

    async resolveConflict(id: string, resolution: SyncConflict['resolution']) {
      await db.syncConflicts.update(id, { resolved: true, resolution });
    },

    async getLastSyncTime(table?: SyncTable) {
      const key = table ? `last_sync_${table}` : 'last_sync_all';
      const row = await db.syncMetadata.get(key);
      return row?.value || null;
    },

    async setLastSyncTime(table: SyncTable, time: string) {
      const key = `last_sync_${table}`;
      await db.syncMetadata.put({ key, value: time });
    },

    async getPendingChangesCount() {
      let total = 0;
      for (const table of SYNC_TABLES) {
        const t = db.dataTables.get(table);
        if (t) {
          const count = await t
            .filter(r => ['pending_create', 'pending_update', 'pending_delete'].includes(r._sync_status))
            .count();
          total += count;
        }
      }
      total += await db.syncQueue.count();
      return total;
    },
  };
}
