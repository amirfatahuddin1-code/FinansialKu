import type { SupabaseClient } from '@supabase/supabase-js';
import type { LocalDatabase } from './localDatabase';
import type { SyncQueueItem, SyncProgress, SyncState, SyncTable, SyncEventMap } from './types';
import { SYNC_TABLES } from './types';
import { createConflictResolver, type ConflictStrategy } from './conflictResolver';
import { getConnectivityDetector, isOnline } from './connectivity';

type SyncEventListener<K extends keyof SyncEventMap> = (...args: SyncEventMap[K]) => void;

export class SyncEngine {
  private db: LocalDatabase;
  private supabase: SupabaseClient;
  private strategy: ConflictStrategy;
  private resolver = createConflictResolver();
  private isSyncing = false;
  private listeners = new Map<string, Set<Function>>();
  private workspaceId: string | null = null;

  constructor(db: LocalDatabase, supabase: SupabaseClient, strategy: ConflictStrategy = 'last-write-wins') {
    this.db = db;
    this.supabase = supabase;
    this.strategy = strategy;
  }

  setWorkspaceId(id: string | null): void {
    this.workspaceId = id;
  }

  on<K extends keyof SyncEventMap>(event: K, listener: SyncEventListener<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Function);
    return () => this.listeners.get(event)?.delete(listener as Function);
  }

  private emit<K extends keyof SyncEventMap>(event: K, ...args: SyncEventMap[K]): void {
    this.listeners.get(event)?.forEach(fn => fn(...args));
  }

  async getState(): Promise<SyncState> {
    return {
      isOnline: isOnline(),
      isSyncing: this.isSyncing,
      lastSyncAt: null,
      pendingChanges: await this.db.getPendingChangesCount(),
      syncStatus: this.isSyncing ? 'syncing' : 'idle',
      progress: { phase: 'idle', current: 0, total: 0 },
    };
  }

  async sync(): Promise<void> {
    if (this.isSyncing || !isOnline()) return;
    this.isSyncing = true;
    this.emit('sync:start');

    try {
      await this.pushChanges();
      await this.pullChanges();
      this.isSyncing = false;
      this.emit('sync:complete', new Date());
    } catch (err: any) {
      this.isSyncing = false;
      this.emit('sync:error', err.message || 'Sync failed');
      throw err;
    }
  }

  private async pushChanges(): Promise<void> {
    this.emitProgress('pushing', 0, 0);

    const queue: SyncQueueItem[] = [];
    let item = await this.db.dequeue();
    while (item) {
      queue.push(item);
      item = await this.db.dequeue();
    }

    if (queue.length === 0) return;

    this.emitProgress('pushing', 0, queue.length);

    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i];
      try {
        await this.executeOperation(entry);
        await this.db.markQueueItemDone(entry.id);
      } catch (err: any) {
        if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
          await this.db.markQueueItemDone(entry.id);
        } else {
          await this.db.markQueueItemFailed(entry.id, err.message || 'Unknown error');
        }
      }
      this.emitProgress('pushing', i + 1, queue.length);
    }
  }

  private async executeOperation(entry: SyncQueueItem): Promise<void> {
    const table = entry.table_name;

    switch (entry.operation) {
      case 'create': {
        const { data } = await this.getSupabaseTable(table)
          .insert({ ...entry.data, updated_at: new Date().toISOString() })
          .select()
          .single();
        if (data) {
          await this.db.setSyncStatus(table as SyncTable, entry.record_id, 'synced');
        }
        break;
      }
      case 'update': {
        const { error: updateErr } = await this.getSupabaseTable(table)
          .update({ ...entry.data, updated_at: new Date().toISOString() })
          .eq('id', entry.record_id);
        if (updateErr) throw updateErr;
        await this.db.setSyncStatus(table as SyncTable, entry.record_id, 'synced');
        break;
      }
      case 'delete': {
        const { error: deleteErr } = await this.getSupabaseTable(table)
          .delete()
          .eq('id', entry.record_id);
        if (deleteErr && !deleteErr.message?.includes('not found')) throw deleteErr;
        await this.db.delete(table as SyncTable, entry.record_id);
        break;
      }
    }
  }

  private async pullChanges(): Promise<void> {
    for (const table of SYNC_TABLES) {
      this.emitProgress('pulling', 0, SYNC_TABLES.length);

      const lastSync = await this.db.getLastSyncTime(table);
      let query = this.getSupabaseTable(table).select('*');

      if (this.workspaceId) {
        query = query.eq('workspace_id', this.workspaceId);
      }

      if (lastSync) {
        query = query.gt('updated_at', lastSync);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) continue;

      for (const record of data) {
        const localSyncStatus = await this.db.getSyncStatus(table, record.id);
        if (localSyncStatus === 'pending_create' || localSyncStatus === 'pending_update') {
          await this.db.addConflict({
            table_name: table,
            record_id: record.id,
            local_data: (await this.db.find(table, record.id)) || {},
            server_data: record,
          });
        } else {
          const local = await this.db.find(table, record.id);
          if (local) {
            await this.db.update(table, record.id, record);
          } else {
            await this.db.insert(table, record);
          }
          await this.db.setSyncStatus(table, record.id, 'synced', record.updated_at);
        }
      }

      await this.db.setLastSyncTime(table, new Date().toISOString());
      this.emitProgress('pulling', SYNC_TABLES.indexOf(table) + 1, SYNC_TABLES.length);
    }
  }

  private getSupabaseTable(table: string) {
    return this.supabase.from(table);
  }

  private emitProgress(phase: SyncProgress['phase'], current: number, total: number): void {
    this.emit('sync:progress', { phase, current, total });
  }
}
