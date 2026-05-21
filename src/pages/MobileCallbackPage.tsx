import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Moodle } from '../lib/moodle';
import { clearRememberedMobileLoginAttempt, getRememberedMobileBaseUrl, parseMobileToken } from '../lib/mobile-login';
import { useAuthStore } from '../store/auth';

export function MobileCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finishing mobile login...');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    async function finishLogin() {
      try {
        const baseUrl = getRememberedMobileBaseUrl();
        if (!baseUrl) throw new Error('Missing Moodle URL for this mobile login attempt');

        const rawCallback = `${window.location.search}${window.location.hash}`;
        const mobileToken = parseMobileToken(rawCallback);
        const siteInfo = await Moodle.siteInfo(baseUrl, mobileToken.token);
        login(baseUrl, mobileToken.token, siteInfo);
        clearRememberedMobileLoginAttempt();
        window.history.replaceState(null, '', '/mobile-callback');
        setStatus('success');
        setMessage('Signed in with Moodle mobile login.');
        setTimeout(() => navigate('/assignments', { replace: true }), 600);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to finish mobile login');
      }
    }

    void finishLogin();
  }, [login, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-active text-brand">
          {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-6 w-6" />}
          {status === 'error' && <XCircle className="h-6 w-6" />}
        </div>
        <h1 className="text-lg font-semibold text-slate-950">Moodle mobile login</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        {status === 'error' && (
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Back to login
          </button>
        )}
      </section>
    </main>
  );
}
