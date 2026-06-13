import type { KarsafinAPI, LocalDatabase, SyncTable } from '@karsafin/shared';
import { SYNC_TABLES, isOnline } from '@karsafin/shared';
import { workspaceContext } from '@karsafin/shared';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getTableForResource(resource: string): SyncTable | null {
  const mapping: Record<string, SyncTable> = {
    transactions: 'transactions',
    categories: 'categories',
    budgets: 'budgets',
    savings: 'savings',
    debts: 'debts',
    accounts: 'financial_accounts',
    events: 'events',
    eventItems: 'event_items',
    eventIncomes: 'event_incomes',
  };
  return mapping[resource] || null;
}

export function createOfflineAPI(api: KarsafinAPI, db: LocalDatabase): KarsafinAPI {
  const wrapWithOffline = (resourceName: string, apiModule: any): any => {
    const tableName = getTableForResource(resourceName);
    if (!tableName) return apiModule;

    const wrapped: any = { ...apiModule };

    if (typeof apiModule.getAll === 'function') {
      const originalGetAll = apiModule.getAll.bind(apiModule);
      wrapped.getAll = async (...args: any[]) => {
        try {
          const result = await originalGetAll(...args);
          if (result.data) {
            for (const record of result.data) {
              try {
                const existing = await db.find(tableName, record.id);
                if (existing) {
                  await db.update(tableName, record.id, record);
                } else {
                  await db.insert(tableName, record);
                }
                await db.setSyncStatus(tableName, record.id, 'synced', record.updated_at);
              } catch {}
            }
          }
          return result;
        } catch {
          try {
            const records = await db.findAll(tableName);
            const filters = args[0] || {};
            let filtered = records;

            if (filters.type) filtered = filtered.filter((r: any) => r.type === filters.type);
            if (filters.startDate) filtered = filtered.filter((r: any) => r.date >= filters.startDate);
            if (filters.endDate) filtered = filtered.filter((r: any) => r.date <= filters.endDate);
            if (filters.categoryId) filtered = filtered.filter((r: any) => r.category_id === filters.categoryId);

            return { data: filtered, error: null };
          } catch (e) {
            return { data: null, error: e as Error };
          }
        }
      };
    }

    if (typeof apiModule.create === 'function') {
      const originalCreate = apiModule.create.bind(apiModule);
      wrapped.create = async (userId: string, input: any) => {
        const localId = generateId();
        const activeWsId = workspaceContext.getActiveWorkspaceId();
        const record = {
          id: localId,
          user_id: userId,
          ...input,
          ...(activeWsId ? { workspace_id: activeWsId } : {}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          await db.insert(tableName, record);
          await db.setSyncStatus(tableName, localId, 'pending_create');
          await db.enqueue({
            id: localId,
            table_name: tableName,
            record_id: localId,
            operation: 'create',
            data: record,
          });
        } catch (e) {
          console.warn(`Failed to queue offline create for ${tableName}:`, e);
        }

        if (isOnline()) {
          try {
            return await originalCreate(userId, input);
          } catch {
            return { data: record, error: null };
          }
        }
        return { data: record, error: null };
      };
    }

    if (typeof apiModule.update === 'function') {
      const originalUpdate = apiModule.update.bind(apiModule);
      wrapped.update = async (id: string, updates: any) => {
        try {
          await db.update(tableName, id, updates);
          await db.setSyncStatus(tableName, id, 'pending_update');
          await db.enqueue({
            id: generateId(),
            table_name: tableName,
            record_id: id,
            operation: 'update',
            data: updates,
          });
        } catch (e) {
          console.warn(`Failed to queue offline update for ${tableName}:`, e);
        }

        if (isOnline()) {
          try {
            return await originalUpdate(id, updates);
          } catch {
            return { data: null, error: null };
          }
        }
        return { data: null, error: null };
      };
    }

    if (typeof apiModule.delete === 'function') {
      const originalDelete = apiModule.delete.bind(apiModule);
      wrapped.delete = async (id: string) => {
        try {
          await db.setSyncStatus(tableName, id, 'pending_delete');
          await db.enqueue({
            id: generateId(),
            table_name: tableName,
            record_id: id,
            operation: 'delete',
            data: { id },
          });
        } catch (e) {
          console.warn(`Failed to queue offline delete for ${tableName}:`, e);
        }

        if (isOnline()) {
          try {
            return await originalDelete(id);
          } catch {
            return { data: null, error: null };
          }
        }
        return { data: null, error: null };
      };
    }

    return wrapped;
  };

  const wrappedAPI: KarsafinAPI = {
    ...api,
    supabase: api.supabase,
    auth: api.auth,
    profiles: api.profiles,
    categories: wrapWithOffline('categories', api.categories),
    transactions: wrapWithOffline('transactions', api.transactions),
    budgets: wrapWithOffline('budgets', api.budgets),
    savings: wrapWithOffline('savings', api.savings),
    events: wrapWithOffline('events', api.events),
    eventItems: wrapWithOffline('eventItems', api.eventItems),
    eventIncomes: wrapWithOffline('eventIncomes', api.eventIncomes),
    debts: wrapWithOffline('debts', api.debts),
    accounts: wrapWithOffline('accounts', api.accounts),
    members: api.members,
    workspaces: api.workspaces,
    whatsapp: api.whatsapp,
    telegram: api.telegram,
    telegramGroup: api.telegramGroup,
    messaging: api.messaging,
    subscription: api.subscription,
    features: api.features,
  };

  return wrappedAPI;
}
