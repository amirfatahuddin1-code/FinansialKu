import * as SQLite from 'expo-sqlite';
import type { LocalDatabase, SyncTable, SyncQueueItem, SyncConflict, SyncStatus } from '@karsafin/shared';
import { SYNC_TABLES } from '@karsafin/shared';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createMobileDatabase(dbName = 'karsafin_offline.db'): LocalDatabase {
  let db: SQLite.SQLiteDatabase | null = null;

  return {
    async init() {
      db = await SQLite.openDatabaseAsync(dbName);

      for (const table of SYNC_TABLES) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS "${table}" (
            id TEXT PRIMARY KEY,
            _sync_status TEXT NOT NULL DEFAULT 'synced',
            _local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            _server_updated_at TEXT
          );
        `);
      }

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS _sync_queue (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL CHECK(operation IN ('create','update','delete')),
          data TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS _sync_conflicts (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          local_data TEXT NOT NULL,
          server_data TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          resolved INTEGER NOT NULL DEFAULT 0,
          resolution TEXT
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS _sync_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    },

    async close() {
      if (db) await db.closeAsync();
    },

    async find(table: SyncTable, id: string) {
      if (!db) return null;
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM "${table}" WHERE id = ?`, id
      );
      return row || null;
    },

    async findAll(table: SyncTable, query?: Record<string, any>) {
      if (!db) return [];
      if (query && Object.keys(query).length > 0) {
        const conditions = Object.entries(query)
          .map(([k, v]) => `"${k}" = '${String(v).replace(/'/g, "''")}'`)
          .join(' AND ');
        return db.getAllAsync<any>(`SELECT * FROM "${table}" WHERE ${conditions}`);
      }
      return db.getAllAsync<any>(`SELECT * FROM "${table}"`);
    },

    async insert(table: SyncTable, record: Record<string, any>) {
      if (!db) return;
      const cols = Object.keys(record);
      const vals = cols.map(c => record[c]);
      const placeholders = cols.map(() => '?').join(',');
      const quotedCols = cols.map(c => `"${c}"`).join(',');

      await db.runAsync(
        `INSERT OR REPLACE INTO "${table}" (${quotedCols}, _sync_status, _local_updated_at) VALUES (${placeholders}, 'synced', datetime('now'))`,
        ...vals
      );
    },

    async update(table: SyncTable, id: string, changes: Record<string, any>) {
      if (!db) return;
      const setClauses = Object.keys(changes)
        .map(k => `"${k}" = ?`)
        .join(', ');
      const vals = Object.values(changes);

      await db.runAsync(
        `UPDATE "${table}" SET ${setClauses}, _local_updated_at = datetime('now') WHERE id = ?`,
        ...vals, id
      );
    },

    async delete(table: SyncTable, id: string) {
      if (!db) return;
      await db.runAsync(`DELETE FROM "${table}" WHERE id = ?`, id);
    },

    async getPendingRecords(table: SyncTable) {
      if (!db) return [];
      return db.getAllAsync<any>(
        `SELECT * FROM "${table}" WHERE _sync_status IN ('pending_create', 'pending_update', 'pending_delete')`
      );
    },

    async getSyncStatus(table: SyncTable, id: string): Promise<SyncStatus | null> {
      if (!db) return null;
      const row = await db.getFirstAsync<{ _sync_status: string }>(
        `SELECT _sync_status FROM "${table}" WHERE id = ?`, id
      );
      return (row?._sync_status as SyncStatus) || null;
    },

    async setSyncStatus(table: SyncTable, id: string, status: SyncStatus, serverUpdatedAt?: string) {
      if (!db) return;
      if (serverUpdatedAt) {
        await db.runAsync(
          `UPDATE "${table}" SET _sync_status = ?, _server_updated_at = ?, _local_updated_at = datetime('now') WHERE id = ?`,
          status, serverUpdatedAt, id
        );
      } else {
        await db.runAsync(
          `UPDATE "${table}" SET _sync_status = ?, _local_updated_at = datetime('now') WHERE id = ?`,
          status, id
        );
      }
    },

    async enqueue(item: Omit<SyncQueueItem, 'created_at' | 'retry_count' | 'status'>) {
      if (!db) return;
      await db.runAsync(
        `INSERT OR REPLACE INTO _sync_queue (id, table_name, record_id, operation, data, created_at, retry_count, status) VALUES (?, ?, ?, ?, ?, datetime('now'), 0, 'pending')`,
        item.id || generateId(), item.table_name, item.record_id, item.operation, JSON.stringify(item.data)
      );
    },

    async dequeue() {
      if (!db) return null;
      const item = await db.getFirstAsync<any>(
        "SELECT * FROM _sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
      );
      if (item) {
        await db.runAsync(
          "UPDATE _sync_queue SET status = 'processing' WHERE id = ?", item.id
        );
        return {
          ...item,
          data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data,
        };
      }
      return null;
    },

    async peek() {
      if (!db) return null;
      const item = await db.getFirstAsync<any>(
        "SELECT * FROM _sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
      );
      if (item) {
        return {
          ...item,
          data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data,
        };
      }
      return null;
    },

    async getQueueLength() {
      if (!db) return 0;
      const row = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM _sync_queue WHERE status = 'pending'"
      );
      return row?.count ?? 0;
    },

    async markQueueItemFailed(id: string, error: string) {
      if (!db) return;
      await db.runAsync(
        "UPDATE _sync_queue SET retry_count = retry_count + 1, last_error = ?, status = 'pending' WHERE id = ?",
        error, id
      );
    },

    async markQueueItemDone(id: string) {
      if (!db) return;
      await db.runAsync('DELETE FROM _sync_queue WHERE id = ?', id);
    },

    async getFailedItems() {
      if (!db) return [];
      const items = await db.getAllAsync<any>(
        'SELECT * FROM _sync_queue WHERE retry_count > 3 ORDER BY retry_count DESC'
      );
      return items.map((item: any) => ({
        ...item,
        data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data,
      }));
    },

    async addConflict(conflict: Omit<SyncConflict, 'id' | 'created_at' | 'resolved'>) {
      if (!db) return;
      await db.runAsync(
        `INSERT OR REPLACE INTO _sync_conflicts (id, table_name, record_id, local_data, server_data, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        generateId(), conflict.table_name, conflict.record_id,
        JSON.stringify(conflict.local_data), JSON.stringify(conflict.server_data)
      );
    },

    async getConflicts(table?: SyncTable) {
      if (!db) return [];
      if (table) {
        const rows = await db.getAllAsync<any>(
          'SELECT * FROM _sync_conflicts WHERE resolved = 0 AND table_name = ? ORDER BY created_at DESC', table
        );
        return rows.map((r: any) => ({ ...r, resolved: !!r.resolved }));
      }
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM _sync_conflicts WHERE resolved = 0 ORDER BY created_at DESC'
      );
      return rows.map((r: any) => ({ ...r, resolved: !!r.resolved }));
    },

    async resolveConflict(id: string, resolution: SyncConflict['resolution']) {
      if (!db) return;
      await db.runAsync(
        `UPDATE _sync_conflicts SET resolved = 1, resolution = ? WHERE id = ?`,
        resolution, id
      );
    },

    async getLastSyncTime(table?: SyncTable) {
      if (!db) return null;
      const key = table ? `last_sync_${table}` : 'last_sync_all';
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM _sync_metadata WHERE key = ?', key
      );
      return row?.value ?? null;
    },

    async setLastSyncTime(table: SyncTable, time: string) {
      if (!db) return;
      const key = `last_sync_${table}`;
      await db.runAsync(
        'INSERT OR REPLACE INTO _sync_metadata (key, value) VALUES (?, ?)', key, time
      );
    },

    async getPendingChangesCount() {
      if (!db) return 0;
      let total = 0;
      for (const table of SYNC_TABLES) {
        const row = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM "${table}" WHERE _sync_status IN ('pending_create', 'pending_update', 'pending_delete')`
        );
        total += row?.count ?? 0;
      }
      const queueRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM _sync_queue'
      );
      total += queueRow?.count ?? 0;
      return total;
    },
  };
}
