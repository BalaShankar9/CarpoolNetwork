export interface RuntimeConfig {
  mapsApiKey: string;
}

let cachedConfig: RuntimeConfig | null = null;
let configPromise: Promise<RuntimeConfig> | null = null;

const parseRuntimeConfig = (data: any): RuntimeConfig => ({
  mapsApiKey: typeof data?.mapsApiKey === 'string' ? data.mapsApiKey : '',
});

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!configPromise) {
    configPromise = (async () => {
      try {
        const response = await fetch('/.netlify/functions/runtime-config', {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Runtime config request failed: ${response.status}`);
        }

        const data = await response.json();
        cachedConfig = parseRuntimeConfig(data);
        return cachedConfig;
      } catch {
        const fallbackKey = import.meta.env.DEV
          ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
          : '';
        cachedConfig = { mapsApiKey: fallbackKey };
        return cachedConfig;
      }
    })();
  }

  return configPromise;
}
