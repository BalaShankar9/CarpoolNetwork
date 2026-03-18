import type { Handler } from '@netlify/functions';
import { securityHeaders, corsPreflightResponse } from './_shared/headers';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsPreflightResponse();

  return {
    statusCode: 200,
    headers: securityHeaders({ 'Cache-Control': 'no-store' }),
    body: JSON.stringify({
      mapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || '',
    }),
  };
};
