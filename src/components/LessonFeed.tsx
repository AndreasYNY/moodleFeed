import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { BookOpen, Check, Clock, ExternalLink, MoreHorizontal, PlayCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuthErrorRedirect } from '../hooks/auth-guard';
import { useLessons } from '../hooks/useLessons';
import { useI18n, type I18nKey } from '../lib/i18n';
import { absoluteMoodleUrl, getCourseColor, sanitizeHtml } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import type { LessonWithCourse } from '../types';
import { EmptyState } from './EmptyState';
import { SkeletonCard } from './SkeletonCard';

const filters = ['all', 'available', 'dueSoon', 'closed', 'done'] as const;
const filterLabels: Record<(typeof filters)[number], I18nKey> = {
  all: 'lessons.filter.all',
  available: 'lessons.filter.available',
  dueSoon: 'lessons.filter.dueSoon',
  closed: 'lessons.filter.closed',
  done: 'lessons.filter.done',
};

function lessonUrl(baseUrl: string | null, lesson: LessonWithCourse) {
  return absoluteMoodleUrl(baseUrl, `/mod/lesson/view.php?id=${lesson.coursemodule}`);
}

function lessonStatus(lesson: LessonWithCourse) {
  if (lesson.completed) return 'completed';
  if (lesson.accessInfo?.preventaccessreasons?.length) return 'closed';
  if (lesson.deadline) {
    const due = lesson.deadline * 1000;
    if (due < Date.now()) return 'overdue';
    if (due - Date.now() <= 48 * 60 * 60 * 1000) return 'dueSoon';
  }
  if (lesson.available && lesson.available * 1000 > Date.now()) return 'locked';
  return 'available';
}

function statusStyle(status: ReturnType<typeof lessonStatus>) {
  if (status === 'completed') return { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' };
  if (status === 'overdue') return { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' };
  if (status === 'dueSoon') return { bg: '#FAEEDA', text: '#854F0B', border: '#E0A93B' };
  if (status === 'closed') return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
  if (status === 'locked') return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
  return { bg: 'var(--accent-light)', text: 'var(--accent-text)', border: 'var(--accent)' };
}

export function LessonFeed() {
  const { t, dateLocale } = useI18n();
  const { baseUrl } = useAuthStore();
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
    return <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} />)}</div>;
  }

  const lessons = (query.data ?? []).filter((lesson) => {
    const status = lessonStatus(lesson);
    if (filter === 'all') return true;
    if (filter === 'done') return lesson.completed;
    if (filter === 'dueSoon') return status === 'dueSoon' || status === 'overdue';
    if (filter === 'closed') return status === 'closed' || status === 'locked';
    return status === 'available';
  });

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === item ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {t(filterLabels[item])}
          </button>
        ))}
      </div>

      {!lessons.length && <EmptyState title={t('lessons.emptyTitle')} body={t('lessons.emptyBody')} />}

      <div className="space-y-3">
        {lessons.map((lesson) => {
          const courseColor = getCourseColor(lesson.course);
          const status = lessonStatus(lesson);
          const colors = statusStyle(status);
          const url = lessonUrl(baseUrl, lesson);
          const dueDate = lesson.deadline ? new Date(lesson.deadline * 1000) : null;
          const availableDate = lesson.available ? new Date(lesson.available * 1000) : null;
          const accessReason = lesson.accessInfo?.preventaccessreasons?.[0]?.message;

          return (
            <article
              key={`${lesson.course}-${lesson.id}`}
              id={`lesson-${lesson.coursemodule}`}
              className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white ${lesson.coursemodule === focusedLessonId ? 'ring-2 ring-brand ring-offset-2' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: courseColor.dot }} />
                      <span className="truncate">{lesson.courseName}</span>
                      {lesson.courseShortName && <span className="shrink-0">· {lesson.courseShortName}</span>}
                    </div>
                    <h2 className="text-[15px] font-medium leading-5 text-slate-950">{lesson.name}</h2>
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" title={t('lessons.actions')}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-soft">
                        <DropdownMenu.Item asChild className="outline-none">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    <BookOpen className="h-3 w-3" />
                    {t('lessons.lessonType')}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  >
                    {status === 'completed' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {status === 'completed'
                      ? t('lessons.status.completed')
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      <Clock className="h-3 w-3" />
                      {isSameDay(dueDate, new Date())
                        ? t('calendar.dueTodayAt', { time: format(dueDate, 'h:mm a', { locale: dateLocale }) })
                        : t('lessons.deadline', { time: format(dueDate, 'MMM d, yyyy · h:mm a', { locale: dateLocale }) })}
                    </span>
                  )}
                </div>

                {accessReason && (
                  <div
                    className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(accessReason) }}
                  />
                )}

                {lesson.intro && (
                  <div className="prose prose-sm mt-3 max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.intro) }} />
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
