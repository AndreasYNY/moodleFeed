import { cn } from '../lib/utils';

export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Shared filter pill row used by the assignments, lessons and forums feeds.
 * Single scrolling row so long filter sets never wrap or clip, with counts
 * shown as a de-emphasised suffix.
 */
export function FilterPills({
  options,
  value,
  onChange,
  className,
}: {
  options: FilterPillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn('-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
              active ? 'bg-brand text-white' : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700',
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="ml-1.5 opacity-75">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
