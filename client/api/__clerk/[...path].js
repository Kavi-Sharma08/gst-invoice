/**
 * Vercel Serverless Function — Clerk FAPI Proxy
 *
 * Proxies all /__clerk/* requests to the real Clerk Frontend API,
 * injecting the required Clerk-Proxy-Url and Clerk-Secret-Key headers
 * so that write operations (sign-up, sign-in, OAuth) work correctly.
 *
 * Required Vercel environment variables:
 *   CLERK_SECRET_KEY  — sk_live_... (server-side only, no VITE_ prefix)
 */

const CLERK_FAPI = 'https://trusty-slug-321.clerk.accounts.dev';
const PROXY_URL = 'https://gst-invoice-brown.vercel.app/__clerk';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);

  // Strip the leading /__clerk prefix to get the real Clerk path
  // e.g. /__clerk/v1/client/sign_ups  =>  /v1/client/sign_ups
  const clerkPath = url.pathname.replace(/^\/__clerk/, '') || '/';
  const targetUrl = `${CLERK_FAPI}${clerkPath}${url.search}`;

  // Forward the original request headers, adding the ones Clerk requires
  const headers = new Headers(req.headers);
  headers.set('Clerk-Proxy-Url', PROXY_URL);
  headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '');

  // Remove the host header so it matches the target host
  headers.delete('host');

  const proxyRequest = new Request(targetUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    duplex: 'half',
  });

  const response = await fetch(proxyRequest);

  // Forward response headers back to the browser
  const responseHeaders = new Headers(response.headers);
  // Allow cookies to be set from the proxied domain
  responseHeaders.set('Access-Control-Allow-Origin', req.headers.get('origin') || '*');
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
