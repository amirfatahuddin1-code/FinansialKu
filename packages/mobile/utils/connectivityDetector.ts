import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { setConnectivityDetector, type ConnectivityDetector } from '@karsafin/shared';

export function createConnectivityDetector(): ConnectivityDetector {
  let online = true;
  const onlineListeners = new Set<() => void>();
  const offlineListeners = new Set<() => void>();

  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const wasOnline = online;
    online = state.isConnected ?? true;

    if (wasOnline !== online) {
      if (online) {
        onlineListeners.forEach(fn => fn());
      } else {
        offlineListeners.forEach(fn => fn());
      }
    }
  });

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
      unsubscribe();
      onlineListeners.clear();
      offlineListeners.clear();
    },
  };
}
