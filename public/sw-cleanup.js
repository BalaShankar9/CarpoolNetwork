// Service worker cleanup — unregister stale workers and clear caches
// Extracted from inline script to allow strict CSP (no 'unsafe-inline').
(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (reg) { reg.unregister(); });
    });
    if (window.caches) {
      caches.keys().then(function (keys) {
        keys.forEach(function (key) { caches.delete(key); });
      });
    }
  }
})();
