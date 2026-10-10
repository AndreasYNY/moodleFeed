import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { BookOpen, Check, Clock, ExternalLink, MoreHorizontal, PlayCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuthErrorRedirect } from '../hooks/auth-guard';
import { lessonStatus, useLessons } from '../hooks/useLessons';
import { useI18n, type I18nKey } from '../lib/i18n';
import { absoluteMoodleUrl, cn, getCourseColor, rewriteContentUrls, sanitizeHtml } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import type { LessonWithCourse } from '../types';
import { EmptyState } from './EmptyState';
import { FilterPills } from './FilterPills';
import { CardSkeletonGrid } from './Skeletons';
import { chipTone, type StatusTone } from '../lib/status-chip';

const filters = ['all', 'overdue', 'dueSoon', 'available', 'answered', 'closed', 'done'] as const;
const filterLabels: Record<(typeof filters)[number], I18nKey> = {
  all: 'lessons.filter.all',
  overdue: 'lessons.filter.overdue',
  dueSoon: 'lessons.filter.dueSoon',
  available: 'lessons.filter.available',
  answered: 'lessons.filter.answered',
  closed: 'lessons.filter.closed',
  done: 'lessons.filter.done',
};

function lessonUrl(baseUrl: string | null, lesson: LessonWithCourse) {
  return absoluteMoodleUrl(baseUrl, `/mod/lesson/view.php?id=${lesson.coursemodule}`);
}

/** Lesson status -> shared chip tone. See lib/status-chip.ts. */
const lessonTone: Record<ReturnType<typeof lessonStatus>, StatusTone | 'accent'> = {
  completed: 'completed',
  answered: 'answered',
  overdue: 'overdue',
  dueSoon: 'dueSoon',
  locked: 'closed',
  closed: 'closed',
  available: 'accent',
};

/** "Available" carries no status of its own, so it borrows the app accent. */
function lessonToneClass(tone: StatusTone | 'accent') {
  return tone === 'accent' ? 'border-brand bg-active text-brand' : chipTone[tone];
}

function matchesLessonFilter(lesson: LessonWithCourse, item: (typeof filters)[number]) {
  const status = lessonStatus(lesson);
  if (item === 'all') return true;
  if (item === 'done') return lesson.completed;
  if (item === 'answered') return status === 'answered';
  if (item === 'overdue') return status === 'overdue';
  if (item === 'dueSoon') return status === 'dueSoon';
  if (item === 'closed') return status === 'closed' || status === 'locked';
  return status === 'available';
}

export function LessonFeed() {
  const { t, dateLocale } = useI18n();
  const { baseUrl, token } = useAuthStore();
  const { lessonCmid } = useParams();
  const [searchParams] = useSearchParams();
  const focusedLessonId = useMemo(() => Number(lessonCmid ?? searchParams.get('lesson')), [lessonCmid, searchParams]);
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const query = useLessons();
  useAuthErrorRedirect(query.error);

  useEffect(() => {
    if (focusedLessonId) setFilter('all');
  }, [focusedLessonId]);

  useEffect(() => {
    if (!focusedLessonId || query.isLoading) return;
    requestAnimationFrame(() => {
      document.getElementById(`lesson-${focusedLessonId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [focusedLessonId, query.isLoading]);

  if (query.isLoading) {
    return <CardSkeletonGrid count={5} variant="lesson" />;
  }

  const allLessons = query.data ?? [];
  const lessons = allLessons.filter((lesson) => matchesLessonFilter(lesson, filter));
  const counts = filters.reduce<Record<string, number>>((acc, item) => {
    acc[item] = allLessons.filter((lesson) => matchesLessonFilter(lesson, item)).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-8">
      <FilterPills
        options={filters.map((item) => ({ value: item, label: t(filterLabels[item]), count: counts[item] ?? 0 }))}
        value={filter}
        onChange={(next) => setFilter(next as (typeof filters)[number])}
      />

      {!lessons.length && <EmptyState title={t('lessons.emptyTitle')} body={t('lessons.emptyBody')} />}

      <div className="space-y-3">
        {lessons.map((lesson) => {
          const courseColor = getCourseColor(lesson.course);
          const status = lessonStatus(lesson);
          const url = lessonUrl(baseUrl, lesson);
          const dueDate = lesson.deadline ? new Date(lesson.deadline * 1000) : null;
          const availableDate = lesson.available ? new Date(lesson.available * 1000) : null;
          const accessReason = lesson.accessInfo?.preventaccessreasons?.[0]?.message;

          return (
            <article
              key={`${lesson.course}-${lesson.id}`}
              id={`lesson-${lesson.coursemodule}`}
              className={`overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-600/80 bg-white dark:bg-gray-900 ${lesson.coursemodule === focusedLessonId ? 'ring-2 ring-brand ring-offset-2 dark:ring-offset-slate-900' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: courseColor.dot }} />
                      <span className="truncate">{lesson.courseName}</span>
                      {lesson.courseShortName && <span className="shrink-0">· {lesson.courseShortName}</span>}
                    </div>
                    <h2 className="text-[15px] font-medium leading-5 text-slate-950 dark:text-slate-200">{lesson.name}</h2>
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button type="button" className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800" title={t('lessons.actions')}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-44 rounded-lg border border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 p-1 shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                        <DropdownMenu.Item asChild className="outline-none">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 focus:bg-slate-50 dark:focus:bg-gray-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {t('lessons.openInMoodle')}
                          </a>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <BookOpen className="h-3 w-3" />
                    {t('lessons.lessonType')}
                  </span>
                  <span
                    className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium', lessonToneClass(lessonTone[status]))}
                  >
                    {status === 'completed' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {status === 'completed'
                      ? t('lessons.status.completed')
                      : status === 'answered'
                        ? t('lessons.status.answered')
                        : status === 'overdue'
                          ? t('lessons.status.overdue')
                          : status === 'closed'
                            ? t('lessons.status.closed')
                            : status === 'dueSoon' && dueDate
                            ? t('lessons.status.dueSoon', { time: formatDistanceToNow(dueDate, { addSuffix: true, locale: dateLocale }) })
                            : status === 'locked' && availableDate
                              ? t('lessons.status.locked', { time: formatDistanceToNow(availableDate, { addSuffix: true, locale: dateLocale }) })
                            : t('lessons.status.available')}
                  </span>
                  {dueDate && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      {isSameDay(dueDate, new Date())
                        ? t('calendar.dueTodayAt', { time: format(dueDate, 'h:mm a', { locale: dateLocale }) })
                        : t('lessons.deadline', { time: format(dueDate, 'MMM d, yyyy · h:mm a', { locale: dateLocale }) })}
                    </span>
                  )}
                </div>

                {accessReason && (
                  <div
                    className="mt-3 rounded-lg border border-slate-200 dark:border-slate-600/80 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-600 dark:text-slate-400"
                    dangerouslySetInnerHTML={{ __html: rewriteContentUrls(sanitizeHtml(accessReason), token, baseUrl) }}
                  />
                )}

                {lesson.intro && (
                  <div
                    className="prose dark:prose-invert prose-sm mt-3 max-w-none text-slate-700 dark:text-slate-200 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: rewriteContentUrls(sanitizeHtml(lesson.intro), token, baseUrl) }}
                  />
                )}

                <div className="mt-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {status === 'closed' ? t('lessons.viewInMoodle') : t('lessons.openLesson')}
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
