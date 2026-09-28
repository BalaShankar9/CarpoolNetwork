const CACHE = 'carpool-network-v8-8-polished-journeys';
const CORE = ['/', '/styles.css', '/release.css', '/app.js', '/icon.svg', '/community-cover.png', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest', '/email-ui.js', '/social.js', '/social.css', '/focus.css', '/polish.css', '/diagnostics.js', '/diagnostics.css', '/passkeys.js', '/locations.js', '/geo.js', '/member-details.js', '/profile-photo.js', '/contact-details.js','/live-trip.js','/commutes.js', '/town-map.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k.startsWith('carpool-network-') && k!==CACHE).map(k=>caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    if (response.ok && response.type === 'basic') event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request.mode === 'navigate' ? '/' : event.request, copy)));
    return response;
  }).catch(async () => (await caches.match(event.request.mode === 'navigate' ? '/' : event.request)) || new Response('Unavailable offline', { status: 503 })));
});
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('Carpool Network', {
    body: 'You have a new community alert. Tap to open Carpool Network.',
    icon: '/icon-192.png', badge: '/icon.svg', tag: 'carpool-network-alert', renotify: true,
    data: { url: '/?view=alerts' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    for (const client of list) {
        if ('focus' in client) { return client.navigate('/?view=alerts').then(() => client.focus()); }
    }
    return clients.openWindow('/?view=alerts');
  }));
});
