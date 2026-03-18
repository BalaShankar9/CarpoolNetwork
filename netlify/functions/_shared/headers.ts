/**
 * Shared security headers for all Netlify Functions.
 * Centralises CORS, content-type, and cache-control defaults.
 */

const ALLOWED_ORIGIN = process.env.URL || 'https://carpoolnetwork.co.uk';

/** Standard CORS + security headers for JSON API responses. */
export function securityHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extra,
  };
}

/** Preflight response for CORS OPTIONS requests. */
export function corsPreflightResponse() {
  return {
    statusCode: 204,
    headers: securityHeaders(),
    body: '',
  };
}
