"use client";

import React from 'react';
import { useSync } from '@/providers/SyncProvider';

export default function OfflineBanner() {
  const { syncState } = useSync();
  const { isOnline, pendingChanges } = syncState;

  if (isOnline) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#fef3c7',
      margin: '16px',
      padding: '12px 16px',
      borderRadius: 12,
      border: '1px solid #fde68a',
    }}>
      <span style={{ fontSize: 24, marginRight: 12 }}>📡</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>Anda sedang offline</div>
        <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>
          {pendingChanges > 0
            ? `${pendingChanges} perubahan akan tersinkronisasi saat online`
            : 'Data dapat diakses secara offline'}
        </div>
      </div>
    </div>
  );
}
