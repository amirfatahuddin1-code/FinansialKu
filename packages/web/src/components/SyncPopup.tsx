"use client";

import React, { useEffect, useState } from 'react';
import { useSync } from '@/providers/SyncProvider';

export default function SyncPopup() {
  const { syncState } = useSync();
  const { isSyncing, syncStatus, progress, lastError } = syncState;
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (isSyncing) {
      setVisible(true);
      setAnimClass('popup-enter');
      setTimeout(() => setAnimClass('popup-visible'), 50);
    } else if (syncStatus === 'success' || syncStatus === 'error') {
      setAnimClass('popup-visible');
      const timer = setTimeout(() => {
        setAnimClass('popup-exit');
        setTimeout(() => setVisible(false), 300);
      }, syncStatus === 'success' ? 2000 : 4000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, syncStatus]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        .sync-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity 0.3s;
        }
        .sync-popup {
          background: white;
          border-radius: 24px;
          padding: 32px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          min-width: 280px;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .popup-enter { opacity: 0; transform: scale(0.8); }
        .popup-visible { opacity: 1; transform: scale(1); }
        .popup-exit { opacity: 0; transform: scale(0.8); }
        .sync-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .sync-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: bold;
          color: white;
          margin-bottom: 16px;
        }
        .sync-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-top: 12px;
          text-align: center;
        }
        .sync-subtitle {
          font-size: 14px;
          color: #64748b;
          margin-top: 4px;
          text-align: center;
        }
      `}</style>
      <div className="sync-overlay" style={{ opacity: ['popup-visible', 'popup-enter'].includes(animClass) ? 1 : 0 }}>
        <div className={`sync-popup ${animClass}`}>
          {isSyncing && (
            <>
              <div className="sync-spinner" />
              <div className="sync-title">Menyinkronkan Data...</div>
              {progress.total > 0 && (
                <div className="sync-subtitle">
                  {progress.phase === 'pushing' ? 'Mengirim perubahan...' : 'Mengunduh data...'} ({progress.current}/{progress.total})
                </div>
              )}
            </>
          )}
          {syncStatus === 'success' && (
            <>
              <div className="sync-icon-circle" style={{ background: '#10b981' }}>✓</div>
              <div className="sync-title">Sinkronisasi Berhasil</div>
              <div className="sync-subtitle">Data Anda telah diperbarui</div>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <div className="sync-icon-circle" style={{ background: '#ef4444' }}>✕</div>
              <div className="sync-title">Sinkronisasi Gagal</div>
              <div className="sync-subtitle">{lastError || 'Coba lagi nanti'}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
