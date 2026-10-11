import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAssignments } from '../hooks/useAssignments';
import { useI18n } from '../lib/i18n';
import { collectAttention } from '../lib/assignment-attention';
import { useSettingsStore } from '../store/settings';

/**
 * Topbar alert for assignments graded below the student's threshold that can
 * still be attempted again.
 *
 * Mirrors the calendar's "N overdue" pill, but in amber so the two are not
 * confused, and it navigates rather than just reporting — clicking an item lands
 * on that card, scrolled, highlighted and expanded.
 */
export function AttentionPill() {
  const { t, dateLocale } = useI18n();
  const navigate = useNavigate();
  const { gradeThreshold } = useSettingsStore();
  const { data: assignments, isLoading } = useAssignments({ includeSubmissionStatuses: true });

  const items = useMemo(
    () => collectAttention(assignments, gradeThreshold),
    [assignments, gradeThreshold],
  );

  if (isLoading || items.length === 0) return null;

  const open = (assignmentId: number) => {
    // The nonce is what lets AssignmentFeed re-run its scroll effect when the
    // same assignment is clicked twice; the id alone would not change.
    navigate(`/assignments?assignment=${assignmentId}&focus=${Date.now()}`);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
          title={t('topbar.needsAttention')}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('topbar.needsAttentionCount', { count: items.length })}</span>
          <span className="sm:hidden">{items.length}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 p-1 shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('topbar.needsAttention')}
          </div>
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.assignment.id}
              onSelect={() => open(item.assignment.id)}
              className="cursor-pointer rounded-lg px-3 py-2 outline-none hover:bg-amber-50 focus:bg-amber-50 dark:hover:bg-amber-950/40 dark:focus:bg-amber-950/40"
            >
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {item.assignment.courseShortName ?? item.assignment.courseName}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {item.assignment.name}
                </span>
                <span className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {item.grade.toFixed(2)} / {item.gradeMax}
                </span>
              </div>
              {item.dueDate && (
                <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {t('topbar.attentionDue', { time: formatDistanceToNow(item.dueDate, { addSuffix: true, locale: dateLocale }) })}
                </div>
              )}
            </DropdownMenu.Item>
          ))}
          <div className="border-t border-slate-200 dark:border-slate-600/80 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
            {t('topbar.attentionThreshold', { percent: gradeThreshold })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
