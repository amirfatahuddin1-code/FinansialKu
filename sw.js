// Karsafin Service Worker v1.1 - Optimized
const CACHE_NAME = 'karsafin-v1.1';
const OFFLINE_URL = '/index.html';

// Minimal assets to cache on install (fast install)
const PRECACHE_ASSETS = [
    '/manifest.json',
    '/assets/img/logo.png'
];

// Install event - minimal cache for fast install
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching minimal assets');
                // Use addAll with error handling for each
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
                    )
                );
            })
            .then(() => {
                console.log('[SW] Pre-caching complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - Cache on demand (lazy caching)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip external requests
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    // Skip API and data requests
    if (event.request.url.includes('supabase.co')) return;
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Only cache successful responses for static assets
                if (response.ok && isStaticAsset(event.request.url)) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(event.request, responseClone));
                }
                return response;
            })
            .catch(async () => {
                // Network failed, try cache
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                // For navigation, return cached index.html
                if (event.request.mode === 'navigate') {
                    const offlineResponse = await caches.match(OFFLINE_URL);
                    if (offlineResponse) return offlineResponse;
                }

                return new Response('Offline', { status: 503 });
            })
    );
});

// Helper to check if URL is a static asset worth caching
function isStaticAsset(url) {
    const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.svg', '.woff2'];
    return staticExtensions.some(ext => url.includes(ext));
}

// Handle messages
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
