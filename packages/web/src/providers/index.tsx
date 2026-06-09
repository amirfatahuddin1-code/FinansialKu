"use client";

import React from "react";
import { AuthProvider } from "./AuthProvider";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { FeatureProvider } from "./FeatureProvider";
import { ThemeProvider } from "./ThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ThemeProvider>
          <FeatureProvider>
            {children}
          </FeatureProvider>
        </ThemeProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export { useAuth } from "./AuthProvider";
export { useWorkspace } from "./WorkspaceProvider";
export { useFeatures } from "./FeatureProvider";
export { useTheme } from "./ThemeProvider";
export { getSupabaseClient, createKarsafinAPI } from "@karsafin/shared";
