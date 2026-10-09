import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useI18n, type I18nKey } from '../lib/i18n';
import { Moodle } from '../lib/moodle';
import { clearRememberedMobileLoginAttempt, getRememberedMobileBaseUrl, parseMobileToken } from '../lib/mobile-login';
import { useAuthStore } from '../store/auth';

const knownErrorKeys: Record<string, I18nKey> = {
  'Missing mobile login link': 'error.missingMobileLink',
  'Mobile login link does not contain a token': 'error.mobileLinkNoToken',
  'Mobile login token is invalid': 'error.mobileTokenInvalid',
};

export function MobileCallbackPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(t('mobileCallback.signingIn'));
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const errorMessage = useCallback((error: unknown) => {
    if (!(error instanceof Error)) return t('mobileCallback.failure');
    const key = knownErrorKeys[error.message];
    return key ? t(key) : error.message;
  }, [t]);

  useEffect(() => {
    async function finishLogin() {
      try {
        const baseUrl = getRememberedMobileBaseUrl();
        if (!baseUrl) throw new Error(t('mobileCallback.missingUrl'));

        const rawCallback = `${window.location.search}${window.location.hash}`;
        const mobileToken = parseMobileToken(rawCallback);
        const siteInfo = await Moodle.siteInfo(baseUrl, mobileToken.token);
        login(baseUrl, mobileToken.token, siteInfo);
        clearRememberedMobileLoginAttempt();
        window.history.replaceState(null, '', '/mobile-callback');
        setStatus('success');
        setMessage(t('mobileCallback.success'));
        setTimeout(() => navigate('/assignments', { replace: true }), 600);
      } catch (error) {
        setStatus('error');
        setMessage(errorMessage(error));
      }
    }

    void finishLogin();
  }, [errorMessage, login, navigate, t]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-900 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 p-6 text-center shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-active text-brand">
          {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-6 w-6" />}
          {status === 'error' && <XCircle className="h-6 w-6" />}
        </div>
        <h1 className="text-lg font-semibold text-slate-950 dark:text-slate-200">{t('mobileCallback.title')}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        {status === 'error' && (
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {t('mobileCallback.backToLogin')}
          </button>
        )}
      </section>
    </main>
  );
}
