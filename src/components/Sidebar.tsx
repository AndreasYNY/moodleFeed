import { BookOpenCheck, CalendarDays, MessageSquareText, Settings, SquareLibrary } from 'lucide-react';
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

  return (
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
                  title={hidden ? 'Show course on calendar' : 'Hide course on calendar'}
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
  );
}
