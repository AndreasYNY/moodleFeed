import { clsx, type ClassValue } from 'clsx';

const courseColors = ['#7C3AED', '#0F766E', '#EA5B0C', '#2563EB', '#DB2777'];
const courseColorTokens = [
  { dot: '#7C3AED', light: '#F3E8FF', text: '#6D28D9' },
  { dot: '#0F766E', light: '#CCFBF1', text: '#0F766E' },
  { dot: '#EA5B0C', light: '#FFF1EA', text: '#C2410C' },
  { dot: '#2563EB', light: '#DBEAFE', text: '#1D4ED8' },
  { dot: '#DB2777', light: '#FCE7F3', text: '#BE185D' },
];

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function courseColor(courseId: number) {
  return courseColors[Math.abs(courseId) % courseColors.length];
}

export function getCourseColor(courseId: number) {
  return courseColorTokens[Math.abs(courseId) % courseColorTokens.length];
}

export function stripHtml(html = '') {
  if (typeof window !== 'undefined' && 'DOMParser' in window) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function sanitizeHtml(html = '') {
  if (typeof window === 'undefined' || !('DOMParser' in window)) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, form, input, button').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || (['href', 'src'].includes(name) && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return doc.body.innerHTML;
}

export function initials(name?: string | null) {
  if (!name) return 'MF';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function moodleBasePath(baseUrl: string) {
  const clean = baseUrl.replace(/\/$/, '');
  return import.meta.env.DEV && import.meta.env.VITE_MOODLE_BASE_URL ? '/moodle' : clean;
}

export function moodleRequestUrl(baseUrl: string, path: string) {
  const clean = baseUrl.replace(/\/$/, '');
  if (import.meta.env.DEV && import.meta.env.VITE_MOODLE_BASE_URL) return `/moodle${path}`;
  if (import.meta.env.PROD && import.meta.env.VITE_MOODLE_PROXY === 'vercel') {
    return `/api/moodle${path}`;
  }
  return `${clean}${path}`;
}

export function normalizeMoodleBaseUrl(value: string) {
  const url = new URL(value.trim());
  if (url.username || url.password) throw new Error('Moodle URL cannot include credentials');
  if (url.protocol !== 'https:' && !(import.meta.env.DEV && url.protocol === 'http:')) {
    throw new Error('Moodle URL must use HTTPS');
  }
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

export function moodleProxyHeaders(baseUrl: string): Record<string, string> {
  if (import.meta.env.PROD && import.meta.env.VITE_MOODLE_PROXY === 'vercel') {
    return { 'X-Moodle-Base-Url': baseUrl.replace(/\/$/, '') };
  }
  return {};
}

export function withQuery(url: string, query: URLSearchParams) {
  const value = query.toString();
  if (!value) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${value}`;
}

export function absoluteMoodleUrl(baseUrl: string | null, path: string) {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}
