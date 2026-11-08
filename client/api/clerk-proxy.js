export const config = {
  runtime: 'edge',
};

const ALLOWED_HEADERS = [
  'accept',
  'content-type',
  'user-agent',
  'cookie',
  'authorization',
  'origin',
  'referer',
  'accept-language',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
];

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    url.searchParams.delete('path');
    const query = url.searchParams.toString();
    const targetUrl = `https://frontend-api.clerk.dev/${path}${query ? `?${query}` : ''}`;

    // Determine public proxy host reliably from incoming request headers
    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
    const proxyHost = forwardedHost || 'gst-invoice-brown.vercel.app';
    const proxyUrl = `https://${proxyHost}/__clerk`;

    const headers = new Headers();
    headers.set('Clerk-Proxy-Url', proxyUrl);
    headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '');

    const xForwardedFor = req.headers.get('x-forwarded-for');
    if (xForwardedFor) {
      headers.set('X-Forwarded-For', xForwardedFor.split(',')[0].trim());
    }

    for (const h of ALLOWED_HEADERS) {
      const v = req.headers.get(h);
      if (v) headers.set(h, v);
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      duplex: 'half',
      redirect: 'manual',
    });

    const out = new Headers(response.headers);
    out.delete('content-encoding');
    out.delete('content-length');

    // Preserve multiple Set-Cookie headers
    if (typeof response.headers.getSetCookie === 'function') {
      out.delete('set-cookie');
      for (const cookie of response.headers.getSetCookie()) {
        out.append('set-cookie', cookie);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: out,
    });
  } catch (e) {
    return new Response('Proxy error: ' + e.message, { status: 500 });
  }
}
