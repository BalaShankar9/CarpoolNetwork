export interface RuntimeConfig {
  mapsApiKey: string;
}

let cachedConfig: RuntimeConfig | null = null;
let configPromise: Promise<RuntimeConfig> | null = null;

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  cachedConfig = { mapsApiKey };
  configPromise = Promise.resolve(cachedConfig);
  return cachedConfig;
}
