import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const moodleBaseUrl = validHttpUrl(env.VITE_MOODLE_BASE_URL);

  return {
    plugins: [react()],
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
