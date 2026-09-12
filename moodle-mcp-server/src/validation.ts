const allowedPaths = new Set([
  '/login/token.php',
  '/webservice/rest/server.php',
  '/webservice/upload.php',
]);

function isPrivateIp(hostname: string): boolean {
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

export function validateMoodleUrl(value: string): URL {
  if (!value) throw new Error('Missing Moodle base URL');
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Moodle URL must use HTTPS');
  if (url.username || url.password) throw new Error('Moodle URL cannot include credentials');
  if (isPrivateIp(url.hostname)) throw new Error('Moodle URL host is not allowed');
  url.hash = '';
  url.search = '';
  return url;
}

export function resolveBaseUrl(perRequest?: string | null): string {
  const raw = perRequest || process.env.MOODLE_BASE_URL;
  if (!raw) throw new Error('No Moodle base URL provided. Pass baseUrl or set MOODLE_BASE_URL env var.');
  const url = validateMoodleUrl(raw);
  return url.toString().replace(/\/$/, '');
}

export function resolveToken(perRequest?: string | null): string {
  const token = perRequest || process.env.MOODLE_TOKEN;
  if (!token) throw new Error('No Moodle token provided. Pass token or set MOODLE_TOKEN env var.');
  return token;
}
