export type ConnectivityListener = (isOnline: boolean) => void;

export interface ConnectivityDetector {
  isOnline(): boolean;
  onOnline(cb: () => void): () => void;
  onOffline(cb: () => void): () => void;
  destroy(): void;
}

let detectorInstance: ConnectivityDetector | null = null;

export function setConnectivityDetector(detector: ConnectivityDetector): void {
  detectorInstance = detector;
}

export function getConnectivityDetector(): ConnectivityDetector | null {
  return detectorInstance;
}

export function isOnline(): boolean {
  return detectorInstance?.isOnline() ?? true;
}
