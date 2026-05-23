import { BookOpenCheck, CalendarDays, ChevronDown, MessageSquareText, Settings, SquareLibrary } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useCourses } from '../hooks/useCourses';
import { cn, getCourseColor } from '../lib/utils';
import { useSettingsStore } from '../store/settings';

const items = [
  { to: '/assignments', label: 'Assignments', icon: BookOpenCheck },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/forums', label: 'Forums', icon: MessageSquareText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const coursesQuery = useCourses();
  const { hiddenCourseIds, toggleHiddenCourse } = useSettingsStore();
  const hiddenCourseIdSet = new Set(hiddenCourseIds);
  const [coursesOpen, setCoursesOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] border-r border-slate-200 bg-white md:block">
        <div className="flex h-14 items-center gap-2 px-5 text-lg font-semibold text-slate-950">
          <SquareLibrary className="h-6 w-6 text-brand" />
          MoodleFeed
        </div>
        <nav className="space-y-1 px-3 py-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition',
                  isActive && 'bg-active text-brand',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {!!coursesQuery.data?.length && (
          <div className="border-t border-slate-200 px-3 py-3">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Courses</div>
            <div className="space-y-1">
              {coursesQuery.data.map((course) => {
                const color = getCourseColor(course.id);
                const hidden = hiddenCourseIdSet.has(course.id);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleHiddenCourse(course.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50',
                      hidden && 'opacity-40',
                    )}
                    title={hidden ? 'Show course in feeds' : 'Hide course from feeds'}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
                    <span className="truncate">{course.shortname || course.fullname}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        {coursesOpen && !!coursesQuery.data?.length && (
          <div className="max-h-48 overflow-y-auto border-b border-slate-200 px-3 py-2">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Courses</div>
            <div className="flex flex-wrap gap-1.5">
              {coursesQuery.data.map((course) => {
                const color = getCourseColor(course.id);
                const hidden = hiddenCourseIdSet.has(course.id);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleHiddenCourse(course.id)}
                    className={cn(
                      'inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600',
                      hidden && 'opacity-40',
                    )}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
                    <span className="truncate">{course.shortname || course.fullname}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <nav className="grid h-16 grid-cols-5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-slate-500',
                  isActive && 'text-brand',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setCoursesOpen((value) => !value)}
            className={cn('flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-slate-500', coursesOpen && 'text-brand')}
          >
            <ChevronDown className={cn('h-5 w-5 transition', coursesOpen && 'rotate-180')} />
            Courses
          </button>
        </nav>
      </div>
    </>
  );
}
