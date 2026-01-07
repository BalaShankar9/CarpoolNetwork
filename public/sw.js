const CACHE_NAME = 'carpool-network-v3';
const RUNTIME_CACHE = 'carpool-runtime-v3';
const DATA_CACHE = 'carpool-data-v3';
const OFFLINE_QUEUE = 'carpool-offline-queue';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// API endpoints to cache for offline viewing
const CACHEABLE_API_PATTERNS = [
  /\/rest\/v1\/profiles/,
  /\/rest\/v1\/rides/,
  /\/rest\/v1\/messages/,
  /\/rest\/v1\/bookings/,
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => 
            name !== CACHE_NAME && 
            name !== RUNTIME_CACHE && 
            name !== DATA_CACHE &&
            name !== OFFLINE_QUEUE
          )
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - smart caching strategies
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  
  // Netlify functions - always network
  const isFunctionRequest =
    url.pathname.startsWith('/.netlify/functions/') ||
    url.pathname === '/ai-chat';

  if (isFunctionRequest) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle Supabase API requests
  if (url.hostname.includes('supabase')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Non-GET requests - queue if offline
  if (event.request.method !== 'GET') {
    event.respondWith(handleMutationRequest(event.request));
    return;
  }

  // Static assets - cache first, then network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else - network first with cache fallback
  event.respondWith(networkFirst(event.request));
});

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/static/icon-192.png',
    badge: '/static/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      ...data
    },
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: data.renotify || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CarpoolNetwork', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_DATA_CACHE') {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});

// ============ Helper Functions ============

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

function isCacheableApi(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match('/offline.html');
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleApiRequest(request) {
  const url = request.url;
  
  if (request.method === 'GET' && isCacheableApi(url)) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(DATA_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('X-From-Cache', 'true');
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers
        });
      }
      return new Response(JSON.stringify({ error: 'Offline - no cached data' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return fetch(request);
}

async function handleMutationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    await queueOfflineAction(request);
    
    return new Response(JSON.stringify({ 
      queued: true, 
      message: 'Action queued for when you are back online' 
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function queueOfflineAction(request) {
  const action = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now()
  };

  const cache = await caches.open(OFFLINE_QUEUE);
  const queueKey = `offline-action-${Date.now()}`;
  await cache.put(
    new Request(queueKey),
    new Response(JSON.stringify(action))
  );

  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-offline-actions');
  }
}

async function syncOfflineActions() {
  const cache = await caches.open(OFFLINE_QUEUE);
  const keys = await cache.keys();

  for (const key of keys) {
    try {
      const response = await cache.match(key);
      const action = await response.json();

      const result = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body || undefined
      });

      if (result.ok) {
        await cache.delete(key);
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'OFFLINE_ACTION_SYNCED',
            url: action.url,
            success: true
          });
        });
      }
    } catch (error) {
      console.error('Failed to sync offline action:', error);
    }
  }
}
