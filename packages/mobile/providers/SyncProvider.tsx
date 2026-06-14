import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { useWorkspace } from './WorkspaceProvider';
import { SyncEngine, setConnectivityDetector, type SyncState, type SyncProgress, type LocalDatabase, type ConnectivityDetector } from '@karsafin/shared';
import { createMobileDatabase } from '@/utils/localDatabase';
import { createConnectivityDetector } from '@/utils/connectivityDetector';
import { createOfflineAPI } from '@/utils/offlineApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const SYNC_KEY = '@karsafin_sync_enabled';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, api, setApi } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [syncState, setSyncState] = useState<SyncState>(defaultSyncState);
  const [dbReady, setDbReady] = useState(false);
  const engineRef = useRef<SyncEngine | null>(null);
  const dbRef = useRef<LocalDatabase | null>(null);
  const detectorRef = useRef<ConnectivityDetector | null>(null);
  const initRef = useRef(false);
  const apiReplacedRef = useRef(false);

  React.useMemo(() => {
    if (!user || !api.supabase || apiReplacedRef.current) return;
    const db = createMobileDatabase();
    dbRef.current = db;
    const offlineApi = createOfflineAPI(api, db);
    setApi(offlineApi);
    apiReplacedRef.current = true;
  }, [user, api]);

  useEffect(() => {
    if (!user || !api.supabase || initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const db = dbRef.current || createMobileDatabase();
      dbRef.current = db;
      await db.init();
      setDbReady(true);

      const detector = createConnectivityDetector();
      detectorRef.current = detector;
      setConnectivityDetector(detector as any);

      const engine = new SyncEngine(db, api.supabase);
      engineRef.current = engine;

      if (activeWorkspace) {
        engine.setWorkspaceId(activeWorkspace.id);
      }

      if (!apiReplacedRef.current) {
        const offlineApi = createOfflineAPI(api, db);
        setApi(offlineApi);
        apiReplacedRef.current = true;
      }

      detector.onOnline(async () => {
        setSyncState(prev => ({ ...prev, isOnline: true }));
        await engine.sync();
      });

      detector.onOffline(() => {
        setSyncState(prev => ({ ...prev, isOnline: false }));
      });

      const syncEnabled = await AsyncStorage.getItem(SYNC_KEY);
      if (syncEnabled !== 'false') {
        await engine.sync();
      }
    };

    init().catch(console.warn);

    return () => {
      detectorRef.current?.destroy();
    };
  }, [user]);

  useEffect(() => {
    if (engineRef.current && activeWorkspace) {
      engineRef.current.setWorkspaceId(activeWorkspace.id);
      engineRef.current.sync().catch(console.warn);
    }
  }, [activeWorkspace?.id]);

  const pendingIntervalRef = useRef<any>(null);

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

    pendingIntervalRef.current = setInterval(async () => {
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
      if (pendingIntervalRef.current) clearInterval(pendingIntervalRef.current);
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
