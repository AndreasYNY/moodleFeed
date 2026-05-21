import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ExternalLink, KeyRound, Link2, SquareLibrary } from 'lucide-react';
import { loginToMoodle, Moodle } from '../lib/moodle';
import {
  buildMobileLaunchUrl,
  generateMobilePassport,
  parseMobileToken,
  registerMobileProtocolHandler,
  rememberMobileLoginAttempt,
} from '../lib/mobile-login';
import { normalizeMoodleBaseUrl } from '../lib/utils';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
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
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  function onRegisterMobileHandler() {
    setError('');
    setMobileMessage('');
    try {
      registerMobileProtocolHandler();
      setMobileMessage('Browser handler requested. Approve it if your browser asks.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register mobile login handler');
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
      setMobileMessage('Opened Moodle mobile login. If asked, choose MoodleFeed as the handler.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start mobile login');
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
      setError(err instanceof Error ? err.message : 'Unable to use mobile login link');
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
            <h1 className="text-xl font-semibold text-slate-950">MoodleFeed</h1>
            <p className="text-sm text-slate-500">Sign in with your Moodle account.</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Moodle URL
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} required placeholder="https://moodle.university.edu" className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} required className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </div>
        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button disabled={loading} className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? 'Connecting' : 'Sign in'}
        </button>

        <div className="mt-5 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand" />
              Advanced mobile login
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
          {advancedOpen && (
            <div className="pt-3">
              <p className="mb-3 text-xs leading-5 text-slate-500">
                Uses Moodle's mobile launch flow. Enter your Moodle URL, register the handler once, then open the mobile login page.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onRegisterMobileHandler}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Link2 className="h-4 w-4" />
                  Register handler
                </button>
                <button
                  type="button"
                  onClick={onOpenMobileLogin}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open mobile login
                </button>
              </div>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Paste mobile deep link
                <textarea
                  value={mobileLink}
                  onChange={(event) => setMobileLink(event.target.value)}
                  className="mf-focus mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  placeholder="moodlemobile://token=..."
                />
              </label>
              <button
                type="button"
                onClick={onUseMobileLink}
                disabled={loading || !mobileLink.trim()}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Use mobile link
              </button>
              {mobileMessage && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mobileMessage}</div>}
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
