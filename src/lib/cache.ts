interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300000,
    fallback?: () => T
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    const promise = fetcher()
      .then((data) => {
        this.cache.set(key, { data, timestamp: now, ttl });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);

        if (fallback) {
          const fallbackData = fallback();
          this.cache.set(key, { data: fallbackData, timestamp: now, ttl: 60000 });
          return fallbackData;
        }

        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const cache = new CacheManager();
