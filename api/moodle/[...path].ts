export const config = {
  api: {
    bodyParser: false,
  },
};

type QueryValue = string | string[] | undefined;

type ProxyRequest = {
  method?: string;
  query: Record<string, QueryValue>;
  headers: Record<string, string | string[] | undefined>;
  on(event: 'data', callback: (chunk: Uint8Array) => void): void;
  on(event: 'end', callback: () => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
};

type ProxyResponse = {
  status(code: number): ProxyResponse;
  setHeader(name: string, value: string | string[]): void;
  send(body: Buffer | string): void;
  json(body: unknown): void;
  end(): void;
};

const allowedPaths = new Set([
  '/login/token.php',
  '/webservice/rest/server.php',
  '/webservice/upload.php',
]);

function firstQueryValue(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

function requestedPath(value: QueryValue) {
  const parts = Array.isArray(value) ? value : value ? [value] : [];
  return `/${parts.map((part) => encodeURIComponent(part)).join('/')}`;
}

function isPrivateIp(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host)
  );
}

function parseBaseUrl(value: string | undefined) {
  if (!value) throw new Error('Missing baseUrl');
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Moodle URL must use https');
  if (url.username || url.password) throw new Error('Moodle URL cannot include credentials');
  if (isPrivateIp(url.hostname)) throw new Error('Moodle URL host is not allowed');
  url.hash = '';
  url.search = '';
  return url;
}

function readBody(req: ProxyRequest) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function appendForwardedQuery(target: URL, query: Record<string, QueryValue>) {
  Object.entries(query).forEach(([key, value]) => {
    if (key === 'baseUrl' || key === 'path') return;
    const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
    values.forEach((item) => target.searchParams.append(key, item));
  });
}

export default async function handler(req: ProxyRequest, res: ProxyResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const path = requestedPath(req.query.path);
    if (!allowedPaths.has(path)) {
      res.status(404).json({ error: 'Unsupported Moodle endpoint' });
      return;
    }

    const baseUrl = parseBaseUrl(firstQueryValue(req.query.baseUrl));
    const basePath = baseUrl.pathname.replace(/\/$/, '');
    const target = new URL(`${basePath}${path}`, baseUrl.origin);
    appendForwardedQuery(target, req.query);

    const headers = new Headers();
    const contentType = firstQueryValue(req.headers['content-type']);
    const accept = firstQueryValue(req.headers.accept);
    if (contentType) headers.set('content-type', contentType);
    if (accept) headers.set('accept', accept);

    const method = req.method ?? 'GET';
    const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
    const upstream = await fetch(target, { method, headers, body });
    const responseBody = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);
    ['content-type', 'content-disposition', 'cache-control'].forEach((header) => {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    });
    res.send(responseBody);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Proxy request failed' });
  }
}
