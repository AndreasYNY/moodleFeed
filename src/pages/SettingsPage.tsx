import { useQueryClient } from '@tanstack/react-query';
import { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, initials } from '../lib/utils';
import { defaultClaudePromptTemplate } from '../lib/prompt-builder';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import { Topbar } from '../components/Topbar';

const swatches = ['#EA5B0C', '#7C3AED', '#0F766E', '#2563EB', '#DB2777'];

function stopEnterPropagation(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === 'Enter') {
    event.stopPropagation();
  }
}

export function SettingsPage() {
  const auth = useAuthStore();
  const settings = useSettingsStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notificationPermission = 'Notification' in window ? Notification.permission : 'unsupported';

  return (
    <>
      <Topbar title="Settings" breadcrumb="Preferences" />
      <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[220px_1fr] md:p-6">
        <nav className="h-fit rounded-xl border border-slate-200 bg-white p-2 text-sm font-medium text-slate-600">
          {['Profile', 'Moodle connection', 'Notifications', 'Forums', 'Appearance', 'Sync', 'Privacy'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="block rounded-lg px-3 py-2 hover:bg-slate-50">
              {item}
            </a>
          ))}
        </nav>
        <div className="space-y-4">
          <section id="profile" className="mf-card">
            <h2 className="mb-4 text-base font-semibold text-slate-950">Profile</h2>
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{initials(auth.userFullName)}</div>
              <div>
                <div className="font-semibold text-slate-950">{auth.userFullName}</div>
                <div className="text-sm text-slate-500">{auth.userEmail || 'No email from Moodle'}</div>
                <div className="text-sm text-slate-500">Student ID: {auth.userId}</div>
              </div>
            </div>
          </section>

          <section id="moodle-connection" className="mf-card">
            <h2 className="mb-3 text-base font-semibold text-slate-950">Moodle connection</h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-600">{auth.baseUrl}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Connected</span>
            </div>
          </section>

          <section id="notifications" className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">Notifications</h2>
            <p className="text-sm text-slate-500">
              Alerts run while MoodleFeed is open. Browser notifications require permission and do not work after the app is closed.
            </p>
            <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
              Assignment due reminders
              <input type="checkbox" checked={settings.notifyBeforeMinutes > 0} onChange={(event) => settings.setSetting('notifyBeforeMinutes', event.target.checked ? 1440 : 0)} />
            </label>
            <label className="block text-sm text-slate-700">
              Remind me before
              <select value={settings.notifyBeforeMinutes} onChange={(event) => settings.setSetting('notifyBeforeMinutes', Number(event.target.value))} className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value={1440}>24h</option>
                <option value={720}>12h</option>
                <option value={360}>6h</option>
                <option value={60}>1h</option>
              </select>
            </label>
            {[
              ['notifyOverdue', 'Overdue alerts'],
              ['notifyNewAssignments', 'New assignments detected'],
              ['notifyForumReplies', 'Forum replies'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-4 text-sm text-slate-700">
                {label}
                <input type="checkbox" checked={Boolean(settings[key as keyof typeof settings])} onChange={(event) => settings.setSetting(key as never, event.target.checked as never)} />
              </label>
            ))}
            <div className="rounded-lg bg-slate-50 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">Browser notifications</div>
                  <div className="text-xs text-slate-500">Permission: {notificationPermission}</div>
                </div>
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={async () => {
                      if (!('Notification' in window)) return;
                      const permission = await Notification.requestPermission();
                      settings.setSetting('notifyBrowser', permission === 'granted');
                    }}
                    disabled={notificationPermission === 'unsupported'}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Enable
                  </button>
                )}
              </div>
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-700">
                Send browser alerts while open
                <input
                  type="checkbox"
                  checked={settings.notifyBrowser}
                  onChange={(event) => settings.setSetting('notifyBrowser', event.target.checked)}
                  disabled={notificationPermission !== 'granted'}
                />
              </label>
            </div>
          </section>

          <section id="forums" className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">Forums</h2>
            <label className="block text-sm text-slate-700">
              Hide discussion names matching regex
              <textarea
                value={settings.forumNameFilters.join('\n')}
                onKeyDown={stopEnterPropagation}
                onChange={(event) =>
                  settings.setSetting(
                    'forumNameFilters',
                    event.target.value.split('\n'),
                  )
                }
                className="mf-focus mt-1 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder={'^Perkenalan$\nDiskusi\\.[12]\nUTBK|Tugas'}
              />
            </label>
            <p className="text-xs text-slate-500">
              One JavaScript regex per line. Matching is case-insensitive; invalid regex lines are ignored.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span>{settings.dismissedDiscussionIds.length} dismissed discussions</span>
              <button
                onClick={settings.clearDismissedDiscussions}
                disabled={!settings.dismissedDiscussionIds.length}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50"
              >
                Restore all
              </button>
            </div>
            <label className="block text-sm text-slate-700">
              Claude forum prompt template
              <textarea
                value={settings.forumPromptTemplate || defaultClaudePromptTemplate}
                onKeyDown={stopEnterPropagation}
                onChange={(event) => settings.setSetting('forumPromptTemplate', event.target.value)}
                className="mf-focus mt-1 min-h-96 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </label>
            <p className="text-xs text-slate-500">
              Available placeholders: {'{courseFullName}'}, {'{courseShortName}'}, {'{forumName}'}, {'{discussionId}'}, {'{threadUrl}'}, {'{forumPrompt}'}, {'{tutorContext}'}, {'{studentContext}'}.
            </p>
            <button
              onClick={() => settings.setSetting('forumPromptTemplate', defaultClaudePromptTemplate)}
              className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
            >
              Reset prompt template
            </button>
          </section>

          <section id="appearance" className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">Appearance</h2>
            <label className="block text-sm text-slate-700">
              Theme
              <select value={settings.theme} onChange={(event) => settings.setSetting('theme', event.target.value as typeof settings.theme)} className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <div className="flex gap-2">
              {swatches.map((color) => (
                <button
                  key={color}
                  onClick={() => settings.setSetting('accentColor', color)}
                  className={cn(
                    'h-8 w-8 rounded-full border border-slate-200 ring-offset-2',
                    settings.accentColor === color && 'ring-2 ring-brand',
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
              Compact feed
              <input type="checkbox" checked={settings.compactFeed} onChange={(event) => settings.setSetting('compactFeed', event.target.checked)} />
            </label>
          </section>

          <section id="sync" className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">Sync</h2>
            <label className="block text-sm text-slate-700">
              Auto-sync interval
              <select value={settings.syncInterval} onChange={(event) => settings.setSetting('syncInterval', event.target.value === 'manual' ? 'manual' : Number(event.target.value) as 15 | 30 | 60)} className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value={15}>15min</option>
                <option value={30}>30min</option>
                <option value={60}>1h</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <div className="text-sm text-slate-500">Last synced: {new Date().toLocaleString()}</div>
            <button onClick={() => queryClient.invalidateQueries()} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Sync now</button>
          </section>

          <section id="privacy" className="mf-card space-y-3 border-red-200">
            <h2 className="text-base font-semibold text-red-700">Danger zone</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { auth.logout(); navigate('/login', { replace: true }); }} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Disconnect</button>
              <button onClick={() => { queryClient.clear(); localStorage.clear(); auth.logout(); navigate('/login', { replace: true }); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Clear cache</button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
