export const config = { runtime: 'edge' };

const CLERK_FAPI = 'https://frontend-api.clerk.dev';

export default async function handler(req) {
  const url = new URL(req.url);

  // The rewrite passes the original path as ?path=...
  const path = url.searchParams.get('path') || '';
  url.searchParams.delete('path');
  const query = url.searchParams.toString();
  const targetUrl = `${CLERK_FAPI}/${path}${query ? `?${query}` : ''}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.set('Clerk-Proxy-Url', `${url.origin}/__clerk`);
  headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '');
  headers.set(
    'X-Forwarded-For',
    req.headers.get('x-forwarded-for')?.split(',')[0] || ''
  );

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    duplex: 'half',
    redirect: 'manual',
  });

  // The body is already decompressed, so drop headers that no longer match
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}