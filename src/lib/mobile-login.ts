const mobilePassportKey = 'moodlefeed-mobile-passport';
const mobileBaseUrlKey = 'moodlefeed-mobile-base-url';
const mobileUrlScheme = 'web+moodlefeed';

export interface MobileTokenPayload {
  siteId: string;
  token: string;
  privateToken?: string;
}

export function generateMobilePassport() {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `${Date.now()}.${random[0]}${random[1]}`;
}

export function rememberMobileLoginAttempt(baseUrl: string, passport: string) {
  localStorage.setItem(mobileBaseUrlKey, baseUrl);
  localStorage.setItem(mobilePassportKey, passport);
}

export function getRememberedMobileBaseUrl() {
  return localStorage.getItem(mobileBaseUrlKey);
}

export function clearRememberedMobileLoginAttempt() {
  localStorage.removeItem(mobileBaseUrlKey);
  localStorage.removeItem(mobilePassportKey);
}

export function buildMobileLaunchUrl(baseUrl: string, passport: string) {
  const url = new URL('/admin/tool/mobile/launch.php', baseUrl);
  url.search = new URLSearchParams({
    service: 'moodle_mobile_app',
    passport,
    urlscheme: mobileUrlScheme,
    lang: 'en_us',
  }).toString();
  return url.toString();
}

export function registerMobileProtocolHandler() {
  if (!('registerProtocolHandler' in navigator)) {
    throw new Error('Protocol handlers are not supported in this browser');
  }

  navigator.registerProtocolHandler(
    mobileUrlScheme,
    `${window.location.origin}/mobile-callback#%s`,
  );
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

export function extractMobileDeepLink(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Missing mobile login link');

  const hashValue = trimmed.includes('#') ? trimmed.split('#').slice(1).join('#') : '';
  const candidate = hashValue || trimmed;
  let decoded = candidate;
  for (let index = 0; index < 3; index += 1) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

export function parseMobileToken(input: string): MobileTokenPayload {
  const deepLink = extractMobileDeepLink(input);
  const tokenMatch = deepLink.match(/(?:^|[/?#&:])token=([^&#]+)/);
  const encodedToken = tokenMatch?.[1];
  if (!encodedToken) throw new Error('Mobile login link does not contain a token');

  const parts = decodeBase64(encodedToken).split(':::');
  if (parts.length < 2 || !parts[1]) throw new Error('Mobile login token is invalid');

  return {
    siteId: parts[0],
    token: parts[1],
    privateToken: parts[2],
  };
}
