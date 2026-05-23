import { useQueryClient } from '@tanstack/react-query';
import { Github, Trash2, Unplug } from 'lucide-react';
import { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { siClaude, siDeepseek, siGooglegemini, siPerplexity, type SimpleIcon } from 'simple-icons';
import { aiProviders } from '../lib/ai-providers';
import { useI18n, type I18nKey } from '../lib/i18n';
import { cn, initials } from '../lib/utils';
import { defaultAiPromptTemplate } from '../lib/prompt-builder';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import { Topbar } from '../components/Topbar';

const swatches = ['#EA5B0C', '#7C3AED', '#0F766E', '#2563EB', '#DB2777'];
const providerIcons: Partial<Record<string, SimpleIcon>> = {
  claude: siClaude,
  gemini: siGooglegemini,
  deepseek: siDeepseek,
  perplexity: siPerplexity,
};

const settingsNav: Array<{ id: string; labelKey: I18nKey }> = [
  { id: 'profile', labelKey: 'settings.profile' },
  { id: 'moodle-connection', labelKey: 'settings.connection' },
  { id: 'notifications', labelKey: 'settings.notifications' },
  { id: 'forums', labelKey: 'settings.forums' },
  { id: 'appearance', labelKey: 'settings.appearance' },
  { id: 'sync', labelKey: 'settings.sync' },
  { id: 'privacy', labelKey: 'settings.privacy' },
];

function stopEnterPropagation(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === 'Enter') {
    event.stopPropagation();
  }
}

export function SettingsPage() {
  const { language, t } = useI18n();
  const auth = useAuthStore();
  const settings = useSettingsStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notificationPermission = 'Notification' in window ? Notification.permission : 'unsupported';
  const notificationPermissionLabel = {
    granted: t('settings.permission.granted'),
    denied: t('settings.permission.denied'),
    default: t('settings.permission.default'),
    unsupported: t('settings.permission.unsupported'),
  }[notificationPermission];

  return (
    <>
      <Topbar title={t('settings.title')} breadcrumb={t('settings.breadcrumb')} />
      <main className="mx-auto grid max-w-6xl gap-4 p-3 md:grid-cols-[220px_1fr] md:gap-6 md:p-6">
        <nav className="sticky top-14 z-10 flex h-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 text-sm font-medium text-slate-600 md:top-20 md:block">
          {settingsNav.map(({ id, labelKey }) => (
            <a key={id} href={`#${id}`} className="block shrink-0 rounded-lg px-3 py-2 hover:bg-slate-50">
              {t(labelKey)}
            </a>
          ))}
        </nav>
        <div className="space-y-4">
          <section id="profile" className="mf-card">
            <h2 className="mb-4 text-base font-semibold text-slate-950">{t('settings.profile')}</h2>
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{initials(auth.userFullName)}</div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-950">{auth.userFullName}</div>
                <div className="break-words text-sm text-slate-500">{auth.userEmail || t('settings.noEmail')}</div>
                <div className="text-sm text-slate-500">{t('settings.studentId', { id: auth.userId })}</div>
              </div>
            </div>
          </section>

          <section id="moodle-connection" className="mf-card">
            <h2 className="mb-3 text-base font-semibold text-slate-950">{t('settings.connection')}</h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-0 break-all text-sm text-slate-600">{auth.baseUrl}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{t('settings.connected')}</span>
            </div>
          </section>

          <section id="notifications" className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">{t('settings.notifications')}</h2>
            <p className="text-sm text-slate-500">
              {t('settings.notificationHelp')}
            </p>
            <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
              {t('settings.assignmentReminders')}
              <input type="checkbox" checked={settings.notifyBeforeMinutes > 0} onChange={(event) => settings.setSetting('notifyBeforeMinutes', event.target.checked ? 1440 : 0)} />
            </label>
            <label className="block text-sm text-slate-700">
              {t('settings.remindBefore')}
              <select value={settings.notifyBeforeMinutes} onChange={(event) => settings.setSetting('notifyBeforeMinutes', Number(event.target.value))} className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value={1440}>24h</option>
                <option value={720}>12h</option>
                <option value={360}>6h</option>
                <option value={60}>1h</option>
              </select>
            </label>
            {[
              ['notifyOverdue', t('settings.overdueAlerts')],
              ['notifyNewAssignments', t('settings.newAssignments')],
              ['notifyForumReplies', t('settings.forumReplies')],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-4 text-sm text-slate-700">
                {label}
                <input type="checkbox" checked={Boolean(settings[key as keyof typeof settings])} onChange={(event) => settings.setSetting(key as never, event.target.checked as never)} />
              </label>
            ))}
            <div className="rounded-lg bg-slate-50 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">{t('settings.browserNotifications')}</div>
                  <div className="text-xs text-slate-500">{t('settings.permission', { permission: notificationPermissionLabel })}</div>
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
                    {t('settings.enable')}
                  </button>
                )}
              </div>
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-700">
                {t('settings.browserAlerts')}
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
            <h2 className="text-base font-semibold text-slate-950">{t('settings.forums')}</h2>
            <label className="block text-sm text-slate-700">
              {t('settings.hideDiscussionRegex')}
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
              {t('settings.regexHelp')}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span>{t('settings.dismissedDiscussions', { count: settings.dismissedDiscussionIds.length })}</span>
              <button
                onClick={settings.clearDismissedDiscussions}
                disabled={!settings.dismissedDiscussionIds.length}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50"
              >
                {t('settings.restoreAll')}
              </button>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">{t('settings.aiProvider')}</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {aiProviders.map((provider) => {
                  const selected = settings.aiProvider === provider.id;
                  const providerIcon = providerIcons[provider.id];
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => settings.setSetting('aiProvider', provider.id)}
                      className={cn(
                        'mf-focus rounded-xl border bg-white px-3 py-3 text-left transition hover:bg-slate-50',
                        selected ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200',
                      )}
                      aria-pressed={selected}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold', selected ? 'bg-brand text-white' : 'bg-active text-brand')}>
                          {providerIcon ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                              <path d={providerIcon.path} fill="currentColor" />
                            </svg>
                          ) : provider.id === 'chatgpt' ? 'GPT' : 'Ki'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-950">{provider.name}</span>
                          <span className="block truncate text-xs text-slate-500">{provider.url.replace(/^https?:\/\//, '')}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {t('settings.aiHelp')}
            </p>
            <label className="block text-sm text-slate-700">
              {t('settings.aiPromptTemplate')}
              <textarea
                value={settings.forumPromptTemplate || defaultAiPromptTemplate}
                onKeyDown={stopEnterPropagation}
                onChange={(event) => settings.setSetting('forumPromptTemplate', event.target.value)}
                className="mf-focus mt-1 min-h-72 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs md:min-h-96"
              />
            </label>
            <p className="text-xs text-slate-500">
              {t('settings.placeholders', { placeholders: '{courseFullName}, {courseShortName}, {forumName}, {discussionId}, {threadUrl}, {forumPrompt}, {tutorContext}, {studentContext}' })}
            </p>
            <button
              onClick={() => settings.setSetting('forumPromptTemplate', defaultAiPromptTemplate)}
              className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
            >
              {t('settings.resetPrompt')}
            </button>
          </section>

          <section id="appearance" className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">{t('settings.appearance')}</h2>
            <label className="block text-sm text-slate-700">
              {t('settings.language')}
              <select value={settings.language} onChange={(event) => settings.setSetting('language', event.target.value as typeof settings.language)} className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="en">{t('settings.language.en')}</option>
                <option value="id">{t('settings.language.id')}</option>
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              {t('settings.theme')}
              <select value={settings.theme} onChange={(event) => settings.setSetting('theme', event.target.value as typeof settings.theme)} className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="system">{t('settings.theme.system')}</option>
                <option value="light">{t('settings.theme.light')}</option>
                <option value="dark">{t('settings.theme.dark')}</option>
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
              {t('settings.compactFeed')}
              <input type="checkbox" checked={settings.compactFeed} onChange={(event) => settings.setSetting('compactFeed', event.target.checked)} />
            </label>
          </section>

          <section id="sync" className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">{t('settings.sync')}</h2>
            <label className="block text-sm text-slate-700">
              {t('settings.autoSync')}
              <select value={settings.syncInterval} onChange={(event) => settings.setSetting('syncInterval', event.target.value === 'manual' ? 'manual' : Number(event.target.value) as 15 | 30 | 60)} className="mf-focus mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value={15}>15min</option>
                <option value={30}>30min</option>
                <option value={60}>1h</option>
                <option value="manual">{t('settings.manual')}</option>
              </select>
            </label>
            <div className="text-sm text-slate-500">{t('settings.lastSynced', { time: new Date().toLocaleString(language === 'id' ? 'id-ID' : 'en-US') })}</div>
            <button onClick={() => queryClient.invalidateQueries()} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">{t('settings.syncNow')}</button>
          </section>

          <section id="privacy" className="mf-card space-y-3 border-red-200">
            <h2 className="text-base font-semibold text-red-700">{t('settings.dangerZone')}</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { auth.logout(); navigate('/login', { replace: true }); }} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">
                <Unplug className="h-4 w-4" />
                {t('settings.disconnect')}
              </button>
              <button onClick={() => { queryClient.clear(); localStorage.clear(); auth.logout(); navigate('/login', { replace: true }); }} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
                <Trash2 className="h-4 w-4" />
                {t('settings.clearCache')}
              </button>
            </div>
          </section>

          <section className="mf-card space-y-3">
            <h2 className="text-base font-semibold text-slate-950">{t('settings.project')}</h2>
            <a
              href="https://github.com/AndreasYNY/moodleFeed"
              target="_blank"
              rel="noreferrer"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2">
                <Github className="h-4 w-4" />
                {t('settings.github')}
              </span>
              <span className="break-all text-xs text-slate-400">github.com/AndreasYNY/moodleFeed</span>
            </a>
          </section>
        </div>
      </main>
    </>
  );
}
