"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { SyncEngine, setConnectivityDetector, type SyncState, type SyncProgress } from '@karsafin/shared';
import { getSupabaseClient, createKarsafinAPI } from '@karsafin/shared';
import { createWebDatabase } from '@/utils/localDatabase';
import { createBrowserConnectivityDetector } from '@/utils/connectivityDetector';
import { createOfflineAPI } from '@/utils/offlineApi';
import type { LocalDatabase, ConnectivityDetector } from '@karsafin/shared';
import { useAuth } from './AuthProvider';

interface SyncContextValue {
  syncState: SyncState;
  triggerSync: () => Promise<void>;
  engine: SyncEngine | null;
}

const defaultSyncState: SyncState = {
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingChanges: 0,
  syncStatus: 'idle',
  progress: { phase: 'idle', current: 0, total: 0 },
};

const SyncContext = createContext<SyncContextValue>({
  syncState: defaultSyncState,
  triggerSync: async () => {},
  engine: null,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { api, setApi } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>(defaultSyncState);
  const [dbReady, setDbReady] = useState(false);
  const engineRef = useRef<SyncEngine | null>(null);
  const dbRef = useRef<LocalDatabase | null>(null);
  const detectorRef = useRef<ConnectivityDetector | null>(null);
  const initRef = useRef(false);
  const apiReplacedRef = useRef(false);

  React.useMemo(() => {
    if (!api.supabase || apiReplacedRef.current) return;
    const db = createWebDatabase();
    dbRef.current = db;
    const offlineApi = createOfflineAPI(createKarsafinAPI(api.supabase), db);
    setApi(offlineApi);
    apiReplacedRef.current = true;
  }, [api]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const db = dbRef.current || createWebDatabase();
      dbRef.current = db;
      await db.init();
      setDbReady(true);

      const supabase = getSupabaseClient();
      const engine = new SyncEngine(db, supabase);
      engineRef.current = engine;

      if (!apiReplacedRef.current) {
        const offlineApi = createOfflineAPI(createKarsafinAPI(supabase), db);
        setApi(offlineApi);
        apiReplacedRef.current = true;
      }

      const connectivity = createBrowserConnectivityDetector();
      detectorRef.current = connectivity;
      setConnectivityDetector(connectivity as any);

      connectivity.onOnline(async () => {
        setSyncState(prev => ({ ...prev, isOnline: true }));
        await engine.sync();
      });

      connectivity.onOffline(() => {
        setSyncState(prev => ({ ...prev, isOnline: false }));
      });

      if (navigator.onLine) {
        await engine.sync();
      }
    };

    init().catch(console.warn);

    return () => {
      detectorRef.current?.destroy?.();
    };
  }, []);



  useEffect(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    const unsubStart = engine.on('sync:start', () => {
      setSyncState(prev => ({ ...prev, isSyncing: true, syncStatus: 'syncing', lastError: undefined }));
    });

    const unsubComplete = engine.on('sync:complete', (date) => {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: 'success',
        lastSyncAt: date,
        progress: { phase: 'idle', current: 0, total: 0 },
      }));
      setTimeout(() => {
        setSyncState(prev => prev.syncStatus === 'success' ? { ...prev, syncStatus: 'idle' } : prev);
      }, 3000);
    });

    const unsubError = engine.on('sync:error', (error) => {
      setSyncState(prev => ({ ...prev, isSyncing: false, syncStatus: 'error', lastError: error }));
      setTimeout(() => {
        setSyncState(prev => prev.syncStatus === 'error' ? { ...prev, syncStatus: 'idle' } : prev);
      }, 5000);
    });

    const unsubProgress = engine.on('sync:progress', (progress: SyncProgress) => {
      setSyncState(prev => ({ ...prev, progress }));
    });

    const interval = setInterval(async () => {
      if (dbRef.current) {
        const count = await dbRef.current.getPendingChangesCount();
        setSyncState(prev => ({ ...prev, pendingChanges: count }));
      }
    }, 5000);

    return () => {
      unsubStart();
      unsubComplete();
      unsubError();
      unsubProgress();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.sync();
    }
  }, []);

  return (
    <SyncContext.Provider value={{ syncState, triggerSync, engine: engineRef.current }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
}
