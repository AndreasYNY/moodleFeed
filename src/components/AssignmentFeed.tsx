import { useState } from 'react';
import { useAssignments } from '../hooks/useAssignments';
import { useAuthErrorRedirect } from '../hooks/auth-guard';
import type { AssignmentWithCourse } from '../types';
import { AssignmentCard } from './AssignmentCard';
import { EmptyState } from './EmptyState';
import { SkeletonCard } from './SkeletonCard';

function groupOf(assignment: AssignmentWithCourse) {
  if (assignment.submitted) return 'Completed';
  const due = assignment.duedate ? assignment.duedate * 1000 : null;
  if (!due) return 'Upcoming';
  const diff = due - Date.now();
  if (diff < 0) return 'Overdue';
  if (diff <= 48 * 60 * 60 * 1000) return 'Due soon';
  return 'Upcoming';
}

const groups = ['Overdue', 'Due soon', 'Upcoming', 'Completed'] as const;
const filters = ['All', 'Overdue', 'Due soon', 'Done'] as const;

export function AssignmentFeed() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [sort, setSort] = useState('due');
  const query = useAssignments();
  useAuthErrorRedirect(query.error);

  if (query.isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} />)}</div>;
  }

  const assignments = (query.data ?? [])
    .filter((assignment) => {
      if (filter === 'All') return true;
      if (filter === 'Done') return assignment.submitted;
      return groupOf(assignment) === filter;
    })
    .sort((a, b) => (sort === 'course' ? a.courseName.localeCompare(b.courseName) : (a.duedate ?? 0) - (b.duedate ?? 0)));

  const counts = groups.reduce<Record<string, number>>((acc, group) => {
    acc[group] = (query.data ?? []).filter((assignment) => groupOf(assignment) === group).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filter === item ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="mf-focus rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="due">By due date</option>
          <option value="course">By course</option>
        </select>
      </div>

      {!assignments.length && <EmptyState title="No assignments here" body="Your Moodle feed has nothing matching this filter." />}

      {groups.map((group) => {
        const items = assignments.filter((assignment) => groupOf(assignment) === group);
        if (!items.length) return null;
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group}</h2>
            {items.map((assignment) => (
              <AssignmentCard key={`${assignment.course}-${assignment.id}`} assignment={assignment} />
            ))}
          </section>
        );
      })}

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:left-[220px]">
        <div className="mx-auto flex max-w-5xl justify-between text-xs font-medium text-slate-600">
          {groups.map((group) => (
            <span key={group}>{group}: {counts[group] ?? 0}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
