import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAssignments } from '../hooks/useAssignments';
import { useAuthErrorRedirect } from '../hooks/auth-guard';
import { useI18n, type I18nKey } from '../lib/i18n';
import type { AssignmentWithCourse } from '../types';
import { AssignmentCard } from './AssignmentCard';
import { EmptyState } from './EmptyState';
import { FilterPills } from './FilterPills';
import { CardSkeletonGrid } from './Skeletons';

function groupOf(assignment: AssignmentWithCourse) {
  if (assignment.submitted) return 'completed';
  const now = Date.now();
  const due = assignment.duedate ? assignment.duedate * 1000 : null;
  // cutoffdate is the hard stop; Moodle rejects submissions once it passes.
  const cutoff = assignment.cutoffdate ? assignment.cutoffdate * 1000 : null;
  if (!due) return 'upcoming';
  // Submissions are closed for good — nothing left to act on, so this sinks
  // below Completed rather than competing for the top of the feed.
  if (cutoff && cutoff <= now) return 'unavailable';
  // Past the due date but still inside the cutoff window: late submission is
  // still possible, so it stays at the top where it can be acted on.
  if (due < now) return 'overdue';
  if (due - now <= 48 * 60 * 60 * 1000) return 'dueSoon';
  return 'upcoming';
}

const groups = ['overdue', 'dueSoon', 'upcoming', 'completed', 'unavailable'] as const;
const filters = ['all', 'overdue', 'dueSoon', 'done'] as const;
const groupLabels: Record<(typeof groups)[number], I18nKey> = {
  overdue: 'assignments.group.overdue',
  dueSoon: 'assignments.group.dueSoon',
  upcoming: 'assignments.group.upcoming',
  completed: 'assignments.group.completed',
  unavailable: 'assignments.group.unavailable',
};
const filterLabels: Record<(typeof filters)[number], I18nKey> = {
  all: 'assignments.filter.all',
  overdue: 'assignments.filter.overdue',
  dueSoon: 'assignments.filter.dueSoon',
  done: 'assignments.filter.done',
};

export function AssignmentFeed() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const focusedAssignmentId = useMemo(() => Number(searchParams.get('assignment')), [searchParams]);
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [sort, setSort] = useState('due');
  const query = useAssignments();
  useAuthErrorRedirect(query.error);

  useEffect(() => {
    if (focusedAssignmentId) setFilter('all');
  }, [focusedAssignmentId]);

  useEffect(() => {
    if (!focusedAssignmentId || query.isLoading) return;
    requestAnimationFrame(() => {
      document.getElementById(`assignment-${focusedAssignmentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [focusedAssignmentId, query.isLoading]);

  if (query.isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} />)}</div>;
  }

  const assignments = (query.data ?? [])
    .filter((assignment) => {
      if (filter === 'all') return true;
      if (filter === 'done') return assignment.submitted;
      return groupOf(assignment) === filter;
    })
    .sort((a, b) => (sort === 'course' ? a.courseName.localeCompare(b.courseName) : (a.duedate ?? 0) - (b.duedate ?? 0)));

  const counts = groups.reduce<Record<string, number>>((acc, group) => {
    acc[group] = (query.data ?? []).filter((assignment) => groupOf(assignment) === group).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <FilterPills
          options={filters.map((item) => ({
            value: item,
            label: t(filterLabels[item]),
            count: item === 'all'
              ? (query.data?.length ?? 0)
              : item === 'done'
                ? (counts.completed ?? 0)
                : (counts[item] ?? 0),
          }))}
          value={filter}
          onChange={(next) => setFilter(next as (typeof filters)[number])}
        />
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="mf-focus dark:bg-slate-900 dark:text-slate-200 shrink-0 self-end rounded-lg border border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 dark:bg-slate-900 px-3 py-2 text-sm md:self-auto">
          <option value="due">{t('assignments.sort.due')}</option>
          <option value="course">{t('assignments.sort.course')}</option>
        </select>
      </div>

      {!assignments.length && <EmptyState title={t('assignments.emptyTitle')} body={t('assignments.emptyBody')} />}

      {groups.map((group) => {
        const items = assignments.filter((assignment) => groupOf(assignment) === group);
        if (!items.length) return null;
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t(groupLabels[group])}</h2>
            {items.map((assignment) => (
              <div
                key={`${assignment.course}-${assignment.id}`}
                className={assignment.id === focusedAssignmentId ? 'rounded-xl ring-2 ring-brand ring-offset-2' : undefined}
              >
                <AssignmentCard assignment={assignment} defaultExpanded={assignment.id === focusedAssignmentId} />
              </div>
            ))}
          </section>
        );
      })}

      <div className="fixed bottom-16 left-0 right-0 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur md:bottom-0 md:left-[220px] md:px-4 md:py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 text-[11px] font-medium text-slate-600 md:text-xs">
          {groups.map((group) => (
            <span key={group}>{t(groupLabels[group])}: {counts[group] ?? 0}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
