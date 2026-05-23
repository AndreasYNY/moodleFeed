import { ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { initials } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { NotificationInbox } from './NotificationInbox';

export function Topbar({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userFullName, baseUrl, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 md:px-6">
      <div className="min-w-0">
        <div className="truncate text-xs text-slate-500 md:text-sm">{breadcrumb}</div>
        <h1 className="truncate text-base font-semibold text-slate-950">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        {baseUrl && (
          <a
            href={baseUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            title="Open Moodle"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <button
          onClick={() => queryClient.invalidateQueries()}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          title="Sync now"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <NotificationInbox />
        <div className="hidden h-8 w-8 place-items-center rounded-full bg-brand text-xs font-semibold text-white sm:grid">
          {initials(userFullName)}
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          title="Disconnect"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
