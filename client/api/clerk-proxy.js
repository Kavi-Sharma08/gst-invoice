export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    url.searchParams.delete('path');
    const query = url.searchParams.toString();
    const targetUrl = `https://frontend-api.clerk.dev/${path}${query ? `?${query}` : ''}`;

    const headers = new Headers();
    headers.set('Clerk-Proxy-Url', `${url.origin}/__clerk`);
    headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '');
    headers.set('X-Forwarded-For', req.headers.get('x-forwarded-for')?.split(',')[0] || '');
    for (const h of ['accept', 'content-type', 'user-agent', 'cookie', 'authorization']) {
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
    out.set('x-debug-target', targetUrl);
    out.set('x-debug-has-secret', process.env.CLERK_SECRET_KEY ? 'yes' : 'no');

    return new Response(response.body, { status: response.status, headers: out });
  } catch (e) {
    return new Response('Proxy error: ' + e.message, { status: 500 });
  }
}