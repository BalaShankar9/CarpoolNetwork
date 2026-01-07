// PWA Service - Installation, Updates, and Push Notifications
import { supabase } from '@/lib/supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PWAService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installPromptShown = false;
  private updateAvailable = false;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.dispatchEvent('installready');
    });

    // Track when app is installed
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.dispatchEvent('installed');
      this.trackInstall();
    });

    // Register service worker and check for updates
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      
      // Check for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.dispatchEvent('updateavailable');
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OFFLINE_ACTION_SYNCED') {
          this.dispatchEvent('synced', event.data);
        }
      });

      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  // Check if app can be installed
  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  // Show install prompt
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  // Check if update is available
  hasUpdate(): boolean {
    return this.updateAvailable;
  }

  // Apply update
  async applyUpdate(): Promise<void> {
    if (!this.registration?.waiting) {
      return;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload after new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  }

  // Check if running as installed PWA
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Push Notifications
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await this.subscribeToPush();
    }

    return permission;
  }

  async subscribeToPush(): Promise<void> {
    if (!this.registration) return;

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Get VAPID public key from server (you'd need to configure this)
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.log('VAPID public key not configured');
          return;
        }

        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      // Save subscription to backend
      await this.saveSubscription(subscription);
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }

  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const subJson = subscription.toJSON() as PushSubscriptionJSON;

    await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      });
  }

  async unsubscribeFromPush(): Promise<void> {
    if (!this.registration) return;

    const subscription = await this.registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
      }
    }
  }

  // Cache management
  async cacheUrls(urls: string[]): Promise<void> {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      urls
    });
  }

  async clearDataCache(): Promise<void> {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_DATA_CACHE'
    });
  }

  // Network status
  isOnline(): boolean {
    return navigator.onLine;
  }

  onOnlineChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // Event system
  private dispatchEvent(type: string, detail?: any) {
    window.dispatchEvent(new CustomEvent(`pwa:${type}`, { detail }));
  }

  onInstallReady(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener('pwa:installready', handler);
    return () => window.removeEventListener('pwa:installready', handler);
  }

  onUpdateAvailable(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener('pwa:updateavailable', handler);
    return () => window.removeEventListener('pwa:updateavailable', handler);
  }

  onInstalled(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener('pwa:installed', handler);
    return () => window.removeEventListener('pwa:installed', handler);
  }

  onSynced(callback: (data: any) => void): () => void {
    const handler = (e: Event) => callback((e as CustomEvent).detail);
    window.addEventListener('pwa:synced', handler);
    return () => window.removeEventListener('pwa:synced', handler);
  }

  // Utility functions
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async trackInstall() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_type: 'pwa_install',
        event_data: {
          platform: navigator.platform,
          userAgent: navigator.userAgent
        }
      });
  }
}

export const pwaService = new PWAService();
export default pwaService;
