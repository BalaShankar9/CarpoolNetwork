const CACHE = 'carpool-network-v5-9-1-polish';
const CORE = ['/', '/styles.css', '/app.js', '/diagnostics.js', '/reliability.css', '/release.css', '/focus.css', '/polish.css', '/community-cover.png', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k.startsWith('carpool-network-') && k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if(response.ok && !url.search) event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, response.clone())));
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return (await caches.match('/')) || new Response('You are offline. Reconnect to use Carpool Network.',{status:503,headers:{'content-type':'text/plain'}});
      return new Response('',{status:503});
    }
  })());
});
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('Carpool Network', {
    body: 'You have a new community alert. Tap to open Carpool Network.',
    icon: '/icon.svg', badge: '/icon.svg', tag: 'carpool-network-alert', renotify: true,
    data: { url: '/?view=alerts' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    for (const client of list) {
      if ('focus' in client) { client.navigate('/?view=alerts'); return client.focus(); }
    }
    return clients.openWindow('/?view=alerts');
  }));
});
