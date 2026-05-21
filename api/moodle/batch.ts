type QueryValue = string | string[] | undefined;

type BatchCall = {
  id: string;
  fn: string;
  params?: Record<string, unknown>;
};

type BatchRequestBody = {
  baseUrl?: string;
  token?: string;
  calls?: BatchCall[];
};

type BatchRequest = {
  method?: string;
  headers: Record<string, QueryValue>;
  on(event: 'data', callback: (chunk: Uint8Array) => void): void;
  on(event: 'end', callback: () => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
};

type BatchResponse = {
  status(code: number): BatchResponse;
  json(body: unknown): void;
  end(): void;
};

const maxBatchSize = 100;

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

function readBody(req: BatchRequest) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function encodeParams(params: Record<string, unknown>, prefix?: string, body = new URLSearchParams()) {
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const paramKey = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          encodeParams(item as Record<string, unknown>, `${paramKey}[${index}]`, body);
        } else {
          body.append(`${paramKey}[${index}]`, String(item));
        }
      });
      return;
    }

    if (typeof value === 'object') {
      encodeParams(value as Record<string, unknown>, paramKey, body);
      return;
    }

    body.append(paramKey, String(value));
  });

  return body;
}

async function readJson(req: BatchRequest) {
  const body = await readBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString('utf8')) as BatchRequestBody;
}

async function callMoodle(baseUrl: URL, token: string, call: BatchCall) {
  const target = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/webservice/rest/server.php`, baseUrl.origin);
  target.search = new URLSearchParams({
    wstoken: token,
    wsfunction: call.fn,
    moodlewsrestformat: 'json',
  }).toString();

  const response = await fetch(target, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: encodeParams(call.params ?? {}),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.exception || data?.errorcode) {
    return {
      id: call.id,
      ok: false,
      status: response.status,
      error: data?.message || response.statusText || 'Moodle request failed',
      errorcode: data?.errorcode,
      exception: data?.exception,
    };
  }

  return { id: call.id, ok: true, data };
}

export default async function handler(req: BatchRequest, res: BatchResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = await readJson(req);
    const baseUrl = parseBaseUrl(body.baseUrl);
    const token = body.token;
    const calls = body.calls ?? [];

    if (!token) throw new Error('Missing token');
    if (!Array.isArray(calls) || calls.length === 0) throw new Error('Missing calls');
    if (calls.length > maxBatchSize) throw new Error(`Batch limit is ${maxBatchSize} calls`);

    const results = await Promise.all(calls.map((call) => callMoodle(baseUrl, token, call)));
    res.status(200).json({ results });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Batch request failed' });
  }
}
