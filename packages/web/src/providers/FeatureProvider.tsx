"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { useWorkspace } from "./WorkspaceProvider";
import type { UserFeature } from "@karsafin/shared";

interface FeatureContextValue {
  features: UserFeature[];
  activeWidgets: UserFeature[];
  loading: boolean;
  refresh: () => Promise<void>;
  toggleFeature: (id: string) => Promise<void>;
  reportError: (featureId: string, error: Error) => Promise<void>;
}

const FeatureContext = createContext<FeatureContextValue>({
  features: [],
  activeWidgets: [],
  loading: true,
  refresh: async () => {},
  toggleFeature: async () => {},
  reportError: async () => {},
});

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [features, setFeatures] = useState<UserFeature[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await api.features.getAll(activeWorkspace?.id);
      if (!error && data) {
        setFeatures(data);
      }
    } catch (err) {
      console.warn("Failed to load features:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace, api]);

  useEffect(() => {
    if (user) refresh();
    else { setFeatures([]); setLoading(false); }
  }, [user, refresh]);

  const toggleFeature = useCallback(async (id: string) => {
    const feature = features.find((f) => f.id === id);
    if (!feature) return;
    const { error } = await api.features.toggle(id, !feature.is_enabled);
    if (!error) {
      setFeatures((prev) => prev.map((f) => f.id === id ? { ...f, is_enabled: !f.is_enabled } : f));
    }
  }, [features, api]);

  const reportError = useCallback(async (featureId: string, error: Error) => {
    try {
      await api.features.logError(featureId, error.message, { stack: error.stack });
      setFeatures((prev) => prev.map((f) => {
        if (f.id !== featureId) return f;
        const newCount = f.error_count + 1;
        const autoDisabled = newCount >= f.max_error_count;
        return { ...f, error_count: newCount, last_error: error.message, is_enabled: autoDisabled ? false : f.is_enabled };
      }));
    } catch (err) {
      console.error("Failed to log feature error:", err);
    }
  }, [api]);

  const activeWidgets = features.filter(
    (f) => f.feature_type === "dashboard_widget" && f.is_enabled && f.error_count < f.max_error_count
  );

  return (
    <FeatureContext.Provider value={{ features, activeWidgets, loading, refresh, toggleFeature, reportError }}>
      {children}
    </FeatureContext.Provider>
  );
}

export const useFeatures = () => useContext(FeatureContext);
