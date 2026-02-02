// Karsafin Service Worker v1.2 - Progress Tracking
const CACHE_NAME = 'karsafin-v1.2';
const OFFLINE_URL = '/index.html';

// Assets to precache (essential for a good PWA experience)
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/landing.html',
    '/styles.css',
    '/app.js',
    '/supabase.js',
    '/manifest.json',
    '/assets/img/logo.png',
    '/assets/lib/chart.min.js',
    '/assets/lib/supabase.min.js'
];

// Helper to broadcast progress to all clients
async function broadcastProgress(progress, status) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'INSTALL_PROGRESS',
            progress: progress,
            status: status
        });
    });
}

// Install event with progress tracking
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            let total = PRECACHE_ASSETS.length;
            let loaded = 0;

            // Sequential precache to track progress
            for (const url of PRECACHE_ASSETS) {
                try {
                    await cache.add(url);
                    loaded++;
                    const percent = Math.round((loaded / total) * 100);
                    broadcastProgress(percent, `Mengunduh aset: ${loaded}/${total}`);
                } catch (err) {
                    console.warn(`[SW] Gagal cache: ${url}`, err);
                    loaded++; // Count as "done" (even if failed) to keep progress moving
                }
            }

            console.log('[SW] Pre-caching complete');
            broadcastProgress(100, 'Aplikasi siap diinstal!');
            return self.skipWaiting();
        })()
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

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;
    if (event.request.url.includes('supabase.co')) return;
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok && isStaticAsset(event.request.url)) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(event.request, responseClone));
                }
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                if (event.request.mode === 'navigate') {
                    const offlineResponse = await caches.match(OFFLINE_URL);
                    if (offlineResponse) return offlineResponse;
                }

                return new Response('Offline', { status: 503 });
            })
    );
});

function isStaticAsset(url) {
    const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.svg', '.woff2'];
    return staticExtensions.some(ext => url.includes(ext));
}

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
