import { setConnectivityDetector, type ConnectivityDetector } from '@karsafin/shared';

export function createBrowserConnectivityDetector(): ConnectivityDetector {
  let online = navigator.onLine;
  const onlineListeners = new Set<() => void>();
  const offlineListeners = new Set<() => void>();

  const handleOnline = () => {
    online = true;
    onlineListeners.forEach(fn => fn());
  };

  const handleOffline = () => {
    online = false;
    offlineListeners.forEach(fn => fn());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return {
    isOnline() {
      return online;
    },
    onOnline(cb: () => void) {
      onlineListeners.add(cb);
      return () => onlineListeners.delete(cb);
    },
    onOffline(cb: () => void) {
      offlineListeners.add(cb);
      return () => offlineListeners.delete(cb);
    },
    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      onlineListeners.clear();
      offlineListeners.clear();
    },
  };
}
