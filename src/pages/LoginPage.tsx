import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ExternalLink, KeyRound, Link2, SquareLibrary } from 'lucide-react';
import { loginToMoodle, Moodle } from '../lib/moodle';
import { useI18n, type I18nKey } from '../lib/i18n';
import {
  buildMobileLaunchUrl,
  generateMobilePassport,
  parseMobileToken,
  registerMobileProtocolHandler,
  rememberMobileLoginAttempt,
} from '../lib/mobile-login';
import { normalizeMoodleBaseUrl } from '../lib/utils';
import { useAuthStore } from '../store/auth';

const knownErrorKeys: Record<string, I18nKey> = {
  'Moodle URL cannot include credentials': 'error.moodleUrlCredentials',
  'Moodle URL must use HTTPS': 'error.moodleUrlHttps',
  'Protocol handlers are not supported in this browser': 'error.protocolUnsupported',
  'Missing mobile login link': 'error.missingMobileLink',
  'Mobile login link does not contain a token': 'error.mobileLinkNoToken',
  'Mobile login token is invalid': 'error.mobileTokenInvalid',
};

export function LoginPage() {
  const { t } = useI18n();
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobileLink, setMobileLink] = useState('');
  const [error, setError] = useState('');
  const [mobileMessage, setMobileMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  function errorMessage(error: unknown, fallbackKey: I18nKey) {
    if (!(error instanceof Error)) return t(fallbackKey);
    const key = knownErrorKeys[error.message];
    return key ? t(key) : error.message;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedBaseUrl = normalizeMoodleBaseUrl(baseUrl);
      const auth = await loginToMoodle(normalizedBaseUrl, username, password);
      const siteInfo = await Moodle.siteInfo(normalizedBaseUrl, auth.token);
      login(normalizedBaseUrl, auth.token, siteInfo);
      navigate('/assignments', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'login.errorSignIn'));
    } finally {
      setLoading(false);
    }
  }

  function onRegisterMobileHandler() {
    setError('');
    setMobileMessage('');
    try {
      registerMobileProtocolHandler();
      setMobileMessage(t('login.handlerRequested'));
    } catch (err) {
      setError(errorMessage(err, 'login.errorRegisterHandler'));
    }
  }

  function onOpenMobileLogin() {
    setError('');
    setMobileMessage('');
    try {
      const normalizedBaseUrl = normalizeMoodleBaseUrl(baseUrl);
      const passport = generateMobilePassport();
      rememberMobileLoginAttempt(normalizedBaseUrl, passport);
      window.open(buildMobileLaunchUrl(normalizedBaseUrl, passport), '_blank', 'noopener,noreferrer');
      setMobileMessage(t('login.mobileOpened'));
    } catch (err) {
      setError(errorMessage(err, 'login.errorStartMobile'));
    }
  }

  async function onUseMobileLink() {
    setLoading(true);
    setError('');
    setMobileMessage('');
    try {
      const normalizedBaseUrl = normalizeMoodleBaseUrl(baseUrl);
      const mobileToken = parseMobileToken(mobileLink);
      const siteInfo = await Moodle.siteInfo(normalizedBaseUrl, mobileToken.token);
      login(normalizedBaseUrl, mobileToken.token, siteInfo);
      navigate('/assignments', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'login.errorUseMobile'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-active text-brand">
            <SquareLibrary className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">{t('app.name')}</h1>
            <p className="text-sm text-slate-500">{t('login.subtitle')}</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            {t('login.url')}
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} required placeholder="https://moodle.university.edu" className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('login.username')}
            <input value={username} onChange={(event) => setUsername(event.target.value)} required className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('login.password')}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </div>
        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button disabled={loading} className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? t('login.connecting') : t('login.signIn')}
        </button>

        <div className="mt-5 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand" />
              {t('login.mobileAdvanced')}
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
          {advancedOpen && (
            <div className="pt-3">
              <p className="mb-3 text-xs leading-5 text-slate-500">
                {t('login.mobileDescription')}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onRegisterMobileHandler}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Link2 className="h-4 w-4" />
                  {t('login.registerHandler')}
                </button>
                <button
                  type="button"
                  onClick={onOpenMobileLogin}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('login.openMobileLogin')}
                </button>
              </div>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                {t('login.pasteMobileLink')}
                <textarea
                  value={mobileLink}
                  onChange={(event) => setMobileLink(event.target.value)}
                  className="mf-focus mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  placeholder={t('login.mobileLinkPlaceholder')}
                />
              </label>
              <button
                type="button"
                onClick={onUseMobileLink}
                disabled={loading || !mobileLink.trim()}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                {t('login.useMobileLink')}
              </button>
              {mobileMessage && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mobileMessage}</div>}
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
