/**
 * Shared HTTP plumbing for the marketplace API routes: the price-gauge
 * `json()` + CORS shape, plus the export route's CC-BY licence headers on
 * every 200 of the read (GET) endpoints. The licence covers the STRUCTURAL
 * fields only — listing photographs are the seller's, which is why the routes
 * whose payloads carry images also carry an `image_license` field saying so
 * (DESIGN §5 licence note). The inquiries write path reuses `CORS` but not
 * `json()`: an inquiry acknowledgement is not dataset content, so it carries
 * no licence headers.
 */

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

export const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Export-route-style licence headers; applied to 200s only. */
const LICENSE_HEADERS: Record<string, string> = {
  'X-License': 'CC-BY-4.0',
  Link: `<${LICENSE_URL}>; rel="license"`,
};

/**
 * price-gauge's `json()` helper: pretty-printed body, CORS on every response,
 * licence headers on 200s.
 */
export function json(body: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
      ...CORS,
      ...(status === 200 ? LICENSE_HEADERS : {}),
    },
  });
}
