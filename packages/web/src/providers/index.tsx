"use client";
 
import React from "react";
import { AuthProvider } from "./AuthProvider";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { FeatureProvider } from "./FeatureProvider";
import { ThemeProvider } from "./ThemeProvider";
import { SyncProvider } from "./SyncProvider";
import SyncPopup from "@/components/SyncPopup";
 
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <SyncProvider>
        <ThemeProvider>
          <FeatureProvider>
            {children}
            <SyncPopup />
          </FeatureProvider>
        </ThemeProvider>
        </SyncProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
 
export { useAuth } from "./AuthProvider";
export { useWorkspace } from "./WorkspaceProvider";
export { useFeatures } from "./FeatureProvider";
export { useTheme } from "./ThemeProvider";
export { useSync } from "./SyncProvider";
export { getSupabaseClient, createKarsafinAPI } from "@karsafin/shared";
