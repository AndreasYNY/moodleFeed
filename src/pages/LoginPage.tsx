import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SquareLibrary } from 'lucide-react';
import { loginToMoodle, Moodle } from '../lib/moodle';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
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
      </form>
    </main>
  );
}
