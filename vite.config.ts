import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

type BatchCall = {
  id: string;
  fn: string;
  params?: Record<string, unknown>;
};

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

function readJsonBody(req: IncomingMessage) {
  return new Promise<{ baseUrl?: string; token?: string; calls?: BatchCall[] }>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      resolve(raw ? JSON.parse(raw) : {});
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

function validHttpUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

async function handleMoodleBatch(req: IncomingMessage, res: ServerResponse, fallbackBaseUrl?: string) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = await readJsonBody(req);
    const token = body.token;
    const calls = body.calls ?? [];
    const baseUrlValue = validHttpUrl(fallbackBaseUrl) ?? validHttpUrl(body.baseUrl);
    if (!baseUrlValue) throw new Error('Missing or invalid Moodle base URL');
    const baseUrl = new URL(baseUrlValue);

    if (!token) throw new Error('Missing token');
    if (!calls.length) throw new Error('Missing calls');

    const results = await Promise.all(calls.map(async (call) => {
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
      const data = await response.json().catch(() => null) as {
        exception?: string;
        errorcode?: string;
        message?: string;
      } | null;
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
    }));

    sendJson(res, 200, { results });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'Batch request failed' });
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const moodleBaseUrl = validHttpUrl(env.VITE_MOODLE_BASE_URL);

  return {
    plugins: [
      react(),
      {
        name: 'moodle-dev-batch-proxy',
        configureServer(server) {
          server.middlewares.use('/api/moodle/batch', (req, res) => {
            void handleMoodleBatch(req, res, moodleBaseUrl);
          });
        },
      },
    ],
    server: {
      proxy: moodleBaseUrl
        ? {
            '/moodle': {
              target: moodleBaseUrl,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/moodle/, ''),
            },
          }
        : undefined,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
              return 'vendor-react';
            }
            if (id.includes('/node_modules/@tiptap/') || id.includes('/node_modules/prosemirror-')) {
              return 'vendor-editor';
            }
            if (id.includes('/node_modules/@tanstack/')) {
              return 'vendor-query';
            }
            if (id.includes('/node_modules/@fullcalendar/')) {
              return 'vendor-calendar';
            }
            if (id.includes('/node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('/node_modules/@radix-ui/')) {
              return 'vendor-radix';
            }
            if (id.includes('/node_modules/date-fns/')) {
              return 'vendor-date';
            }
            return 'vendor';
          },
        },
      },
    },
  };
});
