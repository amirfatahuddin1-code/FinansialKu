"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { useSync } from "./SyncProvider";
import { Workspace, workspaceContext } from "@karsafin/shared";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loadingWorkspaces: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = "karsafin_active_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, api } = useAuth();
  const { engine } = useSync();
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
      if (!api.workspaces || typeof api.workspaces.getAll !== "function") {
        console.warn("api.workspaces not available yet");
        setWorkspaces([]);
        setActiveWorkspace(null);
        workspaceContext.setActiveWorkspaceId(null);
        setLoadingWorkspaces(false);
        return;
      }

      const { data, error } = await api.workspaces.getAll();
      if (error) {
        console.warn("Workspace load error:", error);
        setWorkspaces([]);
        setActiveWorkspace(null);
        workspaceContext.setActiveWorkspaceId(null);
        setLoadingWorkspaces(false);
        return;
      }

      const loadedWorkspaces = data || [];
      setWorkspaces(loadedWorkspaces);

      if (loadedWorkspaces.length > 0) {
        const savedId = typeof window !== "undefined" ? localStorage.getItem(WORKSPACE_STORAGE_KEY) : null;
        const savedWs = savedId ? loadedWorkspaces.find((w) => w.id === savedId) : null;
        const selected = savedWs || loadedWorkspaces.find((w) => w.type === "personal") || loadedWorkspaces[0];

        workspaceContext.setActiveWorkspaceId(selected.id);
        setActiveWorkspace(selected);
      } else {
        // Create default personal workspace for new users if it doesn't exist
        try {
          const createRes = await api.workspaces.create(user.id, "Catatan Pribadi", "personal");
          if (createRes.data) {
            const newWs = createRes.data;
            workspaceContext.setActiveWorkspaceId(newWs.id);
            setActiveWorkspace(newWs);
            setWorkspaces([newWs]);

            // Also create a default cash account for this new workspace
            try {
              await api.accounts.create(user.id, {
                name: "Cash",
                type: "other",
                is_default: true,
                color: "#10b981",
                balance: 0,
              });
            } catch (accErr) {
              console.error("Failed to create default account in new workspace:", accErr);
            }
          } else {
            workspaceContext.setActiveWorkspaceId(null);
            setActiveWorkspace(null);
          }
        } catch (createErr) {
          console.error("Failed to create default personal workspace:", createErr);
          workspaceContext.setActiveWorkspaceId(null);
          setActiveWorkspace(null);
        }
      }
    } catch (err) {
      console.warn("Failed to load workspaces:", err);
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
    const selected = workspaces.find((w) => w.id === workspaceId);
    if (selected) {
      workspaceContext.setActiveWorkspaceId(selected.id);
      setActiveWorkspace(selected);
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, selected.id);
      }
    }
  };

  useEffect(() => {
    if (engine && activeWorkspace) {
      engine.setWorkspaceId(activeWorkspace.id);
      engine.sync().catch(console.warn);
    }
  }, [activeWorkspace?.id, engine]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loadingWorkspaces,
        switchWorkspace,
        refreshWorkspaces: loadWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
