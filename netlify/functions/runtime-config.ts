import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || '',
    }),
  };
};
