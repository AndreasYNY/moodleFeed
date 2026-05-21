import { BookOpenCheck, MessageSquareText, Settings, SquareLibrary } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const items = [
  { to: '/assignments', label: 'Assignments', icon: BookOpenCheck },
  { to: '/forums', label: 'Forums', icon: MessageSquareText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
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
    </aside>
  );
}
