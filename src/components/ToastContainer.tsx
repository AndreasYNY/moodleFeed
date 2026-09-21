import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useNotificationsStore } from '../store/notifications';
import { useI18n } from '../lib/i18n';

function ToastItem({ id, title, body, href }: { id: string; title: string; body?: string; href?: string }) {
  const dismissToast = useNotificationsStore((state) => state.dismissToast);
  const { t } = useI18n();

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(id), 8000);
    return () => window.clearTimeout(timer);
  }, [id, dismissToast]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <a href={href ?? '#'} className={href ? 'block min-w-0 flex-1' : 'pointer-events-none block min-w-0 flex-1'}>
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          {body && <div className="mt-1 text-sm leading-5 text-slate-600">{body}</div>}
        </a>
        <button
          onClick={() => dismissToast(id)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"
          title={t('notifications.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useNotificationsStore((state) => state.toasts);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-16 z-50 w-[min(360px,calc(100vw-2rem))] space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} title={toast.title} body={toast.body} href={toast.href} />
      ))}
    </div>
  );
}
