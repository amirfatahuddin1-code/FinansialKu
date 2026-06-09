import { useSyncExternalStore } from 'react';

const primary = '#1E40AF';    // Navy
const accent = '#D4AF37';     // Gold

const ColorsConfig = {
  primary,
  accent,
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  light: {
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    background: '#f8fafc',
    card: '#ffffff',
    cardElevated: '#ffffff',
    border: '#e2e8f0',
    tint: primary,
    tabIconDefault: '#94a3b8',
    tabIconSelected: primary,
    inputBg: '#f1f5f9',
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    background: '#0f172a',
    card: '#1e293b',
    cardElevated: '#1e293b',
    border: '#334155',
    tint: '#60A5FA',
    tabIconDefault: '#64748b',
    tabIconSelected: '#60A5FA',
    inputBg: '#1e293b',
    overlay: 'rgba(0,0,0,0.7)',
  },
};

let _version = 0;
const _listeners = new Set<() => void>();

function _subscribe(listener: () => void) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _getSnapshot() {
  return _version;
}

export const setAppPrimaryColor = (hex: string, isDark: boolean = false) => {
  ColorsConfig.light.tint = hex;
  ColorsConfig.light.tabIconSelected = hex;
  ColorsConfig.dark.tint = hex;
  ColorsConfig.dark.tabIconSelected = hex;
  ColorsConfig.primary = hex;
  _version++;
  _listeners.forEach(fn => fn());
};

export function useColors() {
  useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
  return ColorsConfig;
}

export default ColorsConfig;
