import { BookOpen, BookOpenCheck, CalendarDays, ChevronDown, MessageSquareText, Settings, SquareLibrary } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useCourses } from '../hooks/useCourses';
import { useI18n } from '../lib/i18n';
import { cn, getCourseColor } from '../lib/utils';
import { useSettingsStore } from '../store/settings';

const items = [
  { to: '/assignments', labelKey: 'nav.assignments' as const, icon: BookOpenCheck },
  { to: '/calendar', labelKey: 'nav.calendar' as const, icon: CalendarDays },
  { to: '/lessons', labelKey: 'nav.lessons' as const, icon: BookOpen },
  { to: '/forums', labelKey: 'nav.forums' as const, icon: MessageSquareText },
  { to: '/settings', labelKey: 'nav.settings' as const, icon: Settings },
];

export function Sidebar() {
  const { t } = useI18n();
  const coursesQuery = useCourses();
  const { hiddenCourseIds, toggleHiddenCourse } = useSettingsStore();
  const hiddenCourseIdSet = new Set(hiddenCourseIds);
  const [coursesOpen, setCoursesOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] border-r border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 md:block">
        <div className="flex h-14 items-center gap-2 px-5 text-lg font-semibold text-slate-950 dark:text-slate-200">
          <SquareLibrary className="h-6 w-6 text-brand" />
          {t('app.name')}
        </div>
        <nav className="space-y-1 px-3 py-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  // Active keeps the brand pill; inactive gets a clear hover lift
                  // so the text brightens as well as the background.
                  isActive
                    ? 'bg-active text-brand'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-gray-800 dark:hover:text-slate-100',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        {coursesQuery.isLoading ? (
          <CourseListSkeleton />
        ) : !!coursesQuery.data?.length && (
          <div className="border-t border-slate-200 dark:border-slate-600/80 px-3 py-3">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('nav.courses')}</div>
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
                      'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-gray-800 dark:hover:text-slate-100',
                      hidden && 'opacity-40',
                    )}
                    title={hidden ? t('nav.showCourse') : t('nav.hideCourse')}
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

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-600/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur md:hidden">
        {coursesQuery.isLoading ? (
          <CourseListSkeleton rows={4} />
        ) : coursesOpen && !!coursesQuery.data?.length && (
          <div className="max-h-48 overflow-y-auto border-b border-slate-200 dark:border-slate-600/80 px-3 py-2">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('nav.courses')}</div>
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
                      'inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400',
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
        <nav className="grid h-16 grid-cols-6">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition active:bg-slate-100 dark:active:bg-gray-800',
                  isActive ? 'text-brand' : 'text-slate-500 dark:text-slate-400',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setCoursesOpen((value) => !value)}
            className={cn('flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition active:bg-slate-100 dark:active:bg-gray-800', coursesOpen ? 'text-brand' : 'text-slate-500 dark:text-slate-400')}
          >
            <ChevronDown className={cn('h-5 w-5 transition', coursesOpen && 'rotate-180')} />
            {t('nav.courses')}
          </button>
        </nav>
      </div>
    </>
  );
}
