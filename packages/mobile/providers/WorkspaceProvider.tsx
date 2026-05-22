import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { Workspace, workspaceContext } from '@karsafin/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loadingWorkspaces: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = '@karsafin_active_workspace';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, api } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const loadWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      workspaceContext.setActiveWorkspaceId(null);
      setLoadingWorkspaces(false);
      return;
    }

    setLoadingWorkspaces(true);
    try {
      // Guard: api.workspaces may not exist if shared package cache is stale
      if (!api.workspaces || typeof api.workspaces.getAll !== 'function') {
        console.warn('api.workspaces not available yet, skipping workspace load');
        setWorkspaces([]);
        setActiveWorkspace(null);
        workspaceContext.setActiveWorkspaceId(null);
        setLoadingWorkspaces(false);
        return;
      }

      const { data, error } = await api.workspaces.getAll();
      if (error) {
        console.warn('Workspace load error (RLS?):', error instanceof Error ? error.message : error);
        setWorkspaces([]);
        setActiveWorkspace(null);
        workspaceContext.setActiveWorkspaceId(null);
        setLoadingWorkspaces(false);
        return;
      }
      
      const loadedWorkspaces = data || [];
      setWorkspaces(loadedWorkspaces);

      if (loadedWorkspaces.length > 0) {
        const savedId = await AsyncStorage.getItem(WORKSPACE_STORAGE_KEY);
        const savedWs = savedId ? loadedWorkspaces.find(w => w.id === savedId) : null;
        const selected = savedWs || loadedWorkspaces.find(w => w.type === 'personal') || loadedWorkspaces[0];
        
        // Set synchronously to prevent race conditions on initial page load
        workspaceContext.setActiveWorkspaceId(selected.id);
        setActiveWorkspace(selected);
      } else {
        workspaceContext.setActiveWorkspaceId(null);
        setActiveWorkspace(null);
      }
    } catch (err) {
      console.warn('Failed to load workspaces:', err);
      setWorkspaces([]);
      setActiveWorkspace(null);
      workspaceContext.setActiveWorkspaceId(null);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [user]);

  const switchWorkspace = async (workspaceId: string) => {
    const selected = workspaces.find(w => w.id === workspaceId);
    if (selected) {
      workspaceContext.setActiveWorkspaceId(selected.id);
      setActiveWorkspace(selected);
      await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, selected.id);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loadingWorkspaces,
        switchWorkspace,
        refreshWorkspaces: loadWorkspaces
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
