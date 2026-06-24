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
    shoppingPlans: 'shopping_plans',
    investmentAssets: 'investment_assets',
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
        let result = { data: null as any, error: null as any };
        try {
          result = await originalGetAll(...(args as [any]));
        } catch (e) {
          result.error = e;
        }

        if (result.data && result.data.length >= 0 && !result.error) {
          // Run local database synchronization in the background without blocking the UI
          (async () => {
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
          })().catch(err => console.warn(`Background sync error for ${tableName}:`, err));
          return result;
        }
        
        // Fallback to local DB
        try {
          const records = await db.findAll(tableName);
          const firstArg = args[0];
          const filters = (typeof firstArg === 'string') ? {} : (firstArg || {});
          let filtered = records;
          if (filters.type) filtered = filtered.filter((r: any) => r.type === filters.type);
          if (filters.startDate) filtered = filtered.filter((r: any) => r.date >= filters.startDate);
          if (filters.endDate) filtered = filtered.filter((r: any) => r.date <= filters.endDate);
          if (filters.categoryId) filtered = filtered.filter((r: any) => r.category_id === filters.categoryId);
          return { data: filtered, error: null };
        } catch (e) {
          return { data: null, error: e as Error };
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
        } catch (e) {
          console.warn(`Failed to queue offline create for ${tableName}:`, e);
        }

        if (isOnline()) {
          try {
            const result = await originalCreate(userId, input);
            if (result.data) {
              await db.delete(tableName, localId);
              await db.insert(tableName, result.data);
              await db.setSyncStatus(tableName, result.data.id, 'synced', result.data.updated_at);
              return result;
            }
          } catch {}
        }
        await db.enqueue({ id: localId, table_name: tableName, record_id: localId, operation: 'create', data: record });
        return { data: record, error: null };
      };
    }

    if (typeof apiModule.update === 'function') {
      const originalUpdate = apiModule.update.bind(apiModule);
      wrapped.update = async (id: string, updates: any) => {
        try {
          await db.update(tableName, id, updates);
          await db.setSyncStatus(tableName, id, 'pending_update');
          await db.enqueue({ id: generateId(), table_name: tableName, record_id: id, operation: 'update', data: updates });
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
          await db.delete(tableName, id);
          await db.enqueue({ id: generateId(), table_name: tableName, record_id: id, operation: 'delete', data: { id } });
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
    profiles: (() => {
      const wrapped = { ...api.profiles };
      wrapped.get = async (userId: string) => {
        let result = { data: null as any, error: null as any };
        try { result = await api.profiles.get(userId); } catch(e) { result.error = e; }
        if (result.data && !result.error) {
          try { await db.insert('_profile_cache' as any, { id: userId, ...result.data }); } catch {}
          return result;
        }
        try {
          const cached = await db.find('_profile_cache' as any, userId);
          if (cached) return { data: cached, error: null };
        } catch {}
        return result;
      };
      return wrapped;
    })(),
    categories: (() => {
      const wrapped = wrapWithOffline('categories', api.categories);
      const originalGetOrCreate = api.categories.getOrCreateByName?.bind(api.categories);
      if (originalGetOrCreate) {
        wrapped.getOrCreateByName = async (userId: string, name: string, type: 'income' | 'expense') => {
          if (isOnline()) {
            try { return await originalGetOrCreate(userId, { name, type, icon: 'help-circle', color: '#64748b' }); } catch {}
          }
          const all = await wrapped.getAll({ type });
          if (all.data) {
            const existing = all.data.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
            if (existing) return { data: existing, error: null };
          }
          return await wrapped.create(userId, { name, type, icon: 'help-circle' });
        };
      }
      return wrapped;
    })(),
    transactions: wrapWithOffline('transactions', api.transactions),
    budgets: (() => {
      const wrapped = wrapWithOffline('budgets', api.budgets);
      const originalGetByMonth = api.budgets.getByMonth.bind(api.budgets);
      wrapped.getByMonth = async (year: number, month: number) => {
        let result = { data: null as any, error: null as any };
        try { result = await originalGetByMonth(year, month); } catch(e) { result.error = e; }
        if (result.data && !result.error) {
          try {
            for (const b of result.data) {
               await db.insert('budgets' as any, b);
               await db.setSyncStatus('budgets' as any, b.id, 'synced', b.updated_at);
            }
          } catch {}
          return result;
        }
        try {
          const all = await db.findAll('budgets');
          const activeWsId = workspaceContext.getActiveWorkspaceId();
          const filtered = all.filter((b: any) => 
            b.year === year && 
            b.month === month && 
            (!activeWsId || b.workspace_id === activeWsId)
          );
          return { data: filtered, error: null };
        } catch {}
        return result;
      };
      const originalUpsert = api.budgets.upsert?.bind(api.budgets);
      if (originalUpsert) {
        wrapped.upsert = async (...args: any[]) => {
          if (isOnline()) {
            try { return await originalUpsert(...(args as [string, any])); } catch {}
          }
          return { data: null, error: new Error('Offline') };
        };
      }
      return wrapped;
    })(),
    savings: wrapWithOffline('savings', api.savings),
    events: wrapWithOffline('events', api.events),
    eventItems: wrapWithOffline('eventItems', api.eventItems),
    eventIncomes: wrapWithOffline('eventIncomes', api.eventIncomes),
    debts: wrapWithOffline('debts', api.debts),
    accounts: wrapWithOffline('accounts', api.accounts),
    members: api.members,
    workspaces: (() => {
      const wrapped = { ...api.workspaces };
      const origGetAll = api.workspaces.getAll.bind(api.workspaces);
      wrapped.getAll = async (...args: any[]) => {
        let result = { data: null as any, error: null as any };
        try { result = await origGetAll(); } catch(e) { result.error = e; }
        if (result.data && !result.error) {
          try {
            for (const ws of result.data) {
              await db.insert('_workspace_cache' as any, ws);
            }
          } catch {}
          return result;
        }
        try {
          const cached = await db.findAll('_workspace_cache' as any);
          if (cached && cached.length > 0) {
            return { data: cached, error: null };
          }
        } catch {}
        return result;
      };
      return wrapped;
    })(),
    whatsapp: api.whatsapp,
    telegram: api.telegram,
    telegramGroup: api.telegramGroup,
    messaging: api.messaging,
    subscription: api.subscription,
    features: api.features,
    shoppingPlans: wrapWithOffline('shoppingPlans', api.shoppingPlans),
    investmentAssets: wrapWithOffline('investmentAssets', api.investmentAssets),
  };

  return wrappedAPI;
}
