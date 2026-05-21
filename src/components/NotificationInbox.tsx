import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationsStore } from '../store/notifications';

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { items, markAllRead, removeNotification, clearNotifications } = useNotificationsStore();
  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((value) => !value);
          markAllRead();
        }}
        className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[min(380px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">Notifications</div>
              <div className="text-xs text-slate-500">{items.length} saved alerts</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={markAllRead} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" title="Mark all read">
                <CheckCheck className="h-4 w-4" />
              </button>
              <button onClick={clearNotifications} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" title="Clear inbox">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {!items.length && <div className="px-3 py-8 text-center text-sm text-slate-500">No notifications yet.</div>}
            {items.map((item) => (
              <div key={item.id} className="rounded-lg px-3 py-2 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => {
                      if (!item.href) return;
                      setOpen(false);
                      navigate(item.href);
                    }}
                    className="min-w-0 flex-1 text-left disabled:cursor-default"
                    disabled={!item.href}
                  >
                    <div className="flex items-center gap-2">
                      {!item.read && <span className="h-2 w-2 rounded-full bg-brand" />}
                      <div className="truncate text-sm font-semibold text-slate-950">{item.title}</div>
                    </div>
                    <div className="mt-1 text-sm leading-5 text-slate-600">{item.body}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                    </div>
                  </button>
                  <button
                    onClick={() => removeNotification(item.id)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    title="Remove notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
