import { cn } from '../lib/utils';

/** Reusable bar used by every skeleton below so motion stays in sync. */
function Bar({ className }: { className: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-200 dark:bg-slate-700', className)} />;
}

export function AssignmentCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-600/80 bg-white dark:border-slate-700/80 dark:bg-gray-900">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Bar className="h-2 w-2 rounded-full" />
              <Bar className="h-3 w-40" />
            </div>
            <Bar className="h-4 w-2/3" />
          </div>
          <div className="flex items-center gap-1">
            <Bar className="h-8 w-8 rounded-lg" />
            <Bar className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Bar className="h-6 w-24 rounded-full" />
          <Bar className="h-6 w-28 rounded-full" />
          <Bar className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="h-[3px] bg-slate-100 dark:bg-gray-800">
        <div className="h-full w-0 bg-slate-200 dark:bg-slate-700" />
      </div>
    </article>
  );
}

export function LessonCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-600/80 bg-white p-4 dark:border-slate-700/80 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Bar className="h-2 w-2 rounded-full" />
            <Bar className="h-3 w-40" />
          </div>
          <Bar className="h-4 w-1/2" />
        </div>
        <Bar className="h-8 w-8 rounded-lg" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Bar className="h-6 w-20 rounded-full" />
        <Bar className="h-6 w-24 rounded-full" />
        <Bar className="h-6 w-32 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-4/5" />
      </div>
      <Bar className="mt-4 h-9 w-32 rounded-lg" />
    </article>
  );
}

export function ForumCardSkeleton() {
  return (
    <article className="mf-card dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Bar className="h-2.5 w-2.5 rounded-full" />
            <Bar className="h-3 w-40" />
          </div>
          <Bar className="h-5 w-3/4" />
          <div className="mt-3 flex items-center gap-2">
            <Bar className="h-3 w-24" />
            <Bar className="h-3 w-16" />
          </div>
        </div>
        <Bar className="h-9 w-9 rounded-lg" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Bar className="h-6 w-28 rounded-full" />
        <Bar className="h-6 w-24 rounded-full" />
      </div>
    </article>
  );
}

export function DiscussionSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((block) => (
        <article
          key={block}
          className={cn('mf-card dark:bg-gray-900', block === 0 && 'border-brand/25')}
        >
          {block === 0 ? (
            <>
              <Bar className="mb-3 h-3 w-24" />
              <Bar className="mb-4 h-5 w-1/2" />
              <div className="space-y-2">
                <Bar className="h-3 w-full" />
                <Bar className="h-3 w-11/12" />
                <Bar className="h-3 w-3/4" />
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-start gap-3">
                <Bar className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Bar className="h-3.5 w-32" />
                  <Bar className="mt-2 h-3 w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Bar className="h-3 w-full" />
                <Bar className="h-3 w-5/6" />
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bar className="h-7 w-7 rounded-md" />
          <Bar className="h-7 w-7 rounded-md" />
        </div>
        <Bar className="h-4 w-36" />
        <Bar className="h-7 w-16 rounded-lg" />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, index) => (
          <Bar key={index} className="h-4 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, index) => (
          <div
            key={index}
            className="aspect-square rounded-md border border-slate-200/80 dark:border-slate-600/80 bg-slate-100/60 p-1.5 dark:border-slate-700/60 dark:bg-gray-800/60"
          >
            <Bar className="h-3 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-lg px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Bar className="h-3.5 w-2/3" />
              <Bar className="mt-2 h-3 w-full" />
              <Bar className="mt-2 h-3 w-16" />
            </div>
            <Bar className="h-6 w-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CourseListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-2 px-3 py-1.5">
          <Bar className="h-2 w-2 shrink-0 rounded-full" />
          <Bar className={cn('h-3', index % 2 ? 'w-3/5' : 'w-4/5')} />
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, block) => (
        <section key={block} className="rounded-xl border border-slate-200 dark:border-slate-600/80 bg-white p-4 dark:border-slate-700 dark:bg-gray-900">
          <Bar className="mb-4 h-4 w-32" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Bar className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Bar className="h-3.5 w-1/3" />
                <Bar className="h-3 w-1/4" />
              </div>
            </div>
            <Bar className="h-10 w-full rounded-lg" />
            <div className="flex flex-wrap gap-2">
              <Bar className="h-8 w-20 rounded-lg" />
              <Bar className="h-8 w-20 rounded-lg" />
              <Bar className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/** Grid of skeleton cards, the most common loading shape. */
export function CardSkeletonGrid({
  count = 5,
  variant = 'assignment',
}: {
  count?: number;
  variant?: 'assignment' | 'lesson' | 'forum';
}) {
  const Card = variant === 'lesson' ? LessonCardSkeleton : variant === 'forum' ? ForumCardSkeleton : AssignmentCardSkeleton;
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} />
      ))}
    </div>
  );
}
