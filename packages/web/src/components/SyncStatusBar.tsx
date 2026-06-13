"use client";

import React from 'react';
import { useSync } from '@/providers/SyncProvider';

export default function SyncStatusBar() {
  const { syncState, triggerSync } = useSync();
  const { isOnline, pendingChanges, isSyncing, lastSyncAt } = syncState;

  if (!isOnline) {
    return (
      <div style={{ background: '#f59e0b', padding: '6px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>🔴 Anda sedang offline</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div style={{ background: '#3b82f6', padding: '6px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>🔄 Menyinkronkan...</span>
      </div>
    );
  }

  if (pendingChanges > 0) {
    return (
      <button
        onClick={triggerSync}
        style={{ background: '#f59e0b', padding: '6px 16px', textAlign: 'center', border: 'none', width: '100%', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
          ⏳ {pendingChanges} perubahan menunggu sinkronisasi — Klik untuk sync
        </span>
      </button>
    );
  }

  if (lastSyncAt) {
    return (
      <div style={{ background: '#10b981', padding: '6px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
          ✅ Tersinkron • {lastSyncAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }

  return null;
}
