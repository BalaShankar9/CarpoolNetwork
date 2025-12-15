const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';

export default function EnvironmentBanner() {
  return null;
}

export function useEnvironment() {
  return {
    env: APP_ENV,
    isProduction: APP_ENV === 'production',
    isStaging: APP_ENV === 'staging',
    isDevelopment: APP_ENV === 'development',
  };
}
