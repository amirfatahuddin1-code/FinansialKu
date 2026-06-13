import type { SyncConflict } from './types';

export type ConflictStrategy = 'local-wins' | 'server-wins' | 'last-write-wins';

export interface ConflictResolver {
  resolve(conflict: SyncConflict, strategy?: ConflictStrategy): {
    useLocal: boolean;
    resolvedData?: Record<string, any>;
  };
}

export function createConflictResolver(strategy: ConflictStrategy = 'last-write-wins'): ConflictResolver {
  return {
    resolve(conflict: SyncConflict, overrideStrategy?: ConflictStrategy) {
      const strat = overrideStrategy ?? strategy;

      switch (strat) {
        case 'local-wins':
          return { useLocal: true, resolvedData: conflict.local_data };
        case 'server-wins':
          return { useLocal: false, resolvedData: conflict.server_data };
        case 'last-write-wins': {
          const localTime = new Date(conflict.local_data.local_updated_at || conflict.local_data.updated_at || 0).getTime();
          const serverTime = new Date(conflict.server_data.updated_at || 0).getTime();
          return localTime >= serverTime
            ? { useLocal: true, resolvedData: conflict.local_data }
            : { useLocal: false, resolvedData: conflict.server_data };
        }
      }
    },
  };
}
