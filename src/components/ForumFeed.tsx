import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, EyeOff, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForums } from '../hooks/useForums';
import { useAuthErrorRedirect } from '../hooks/auth-guard';
import { absoluteMoodleUrl, cn } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import type { ForumThread } from '../types';
import { EmptyState } from './EmptyState';
import { SkeletonCard } from './SkeletonCard';

const groups = ['Not replied', 'Checking reply', 'You replied', 'Closed'] as const;
const filters = ['All', ...groups] as const;

function replyLabel(thread: ForumThread) {
  if (thread.replyStatusLoading) return 'Checking reply';
  if (thread.replied) return 'You replied';
  if (thread.acceptsReplies === false) return 'Closed';
  return 'Not replied';
}

function replyBadgeClass(label: ReturnType<typeof replyLabel>) {
  if (label === 'You replied') return 'bg-emerald-50 text-emerald-700';
  if (label === 'Not replied') return 'bg-red-50 text-red-700';
  if (label === 'Closed') return 'bg-slate-100 text-slate-600';
  return 'bg-active text-brand';
}

export function ForumFeed() {
  const query = useForums();
  const baseUrl = useAuthStore((state) => state.baseUrl);
  const dismissDiscussion = useSettingsStore((state) => state.dismissDiscussion);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  useAuthErrorRedirect(query.error);

  if (query.isLoading) {
    return <div className="space-y-3">{Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}</div>;
  }

  if (!query.data?.length) {
    return <EmptyState title="No forum threads" body="Forum discussions from your enrolled courses will appear here." />;
  }

  const filteredThreads = query.data.filter((thread) => filter === 'All' || replyLabel(thread) === filter);
  const counts = filters.reduce<Record<string, number>>((acc, item) => {
    acc[item] = item === 'All' ? query.data.length : query.data.filter((thread) => replyLabel(thread) === item).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-slate-200',
              filter === item ? 'bg-brand text-white ring-brand' : 'bg-white text-slate-600',
            )}
          >
            {item}
            <span className="ml-1 opacity-75">{counts[item] ?? 0}</span>
          </button>
        ))}
      </div>

      {!filteredThreads.length && (
        <EmptyState title="No forum threads" body="No discussions match the selected forum filter." />
      )}

      {groups.map((group) => {
        const threads = filteredThreads.filter((thread) => replyLabel(thread) === group);
        if (!threads.length) return null;

        return (
          <section key={group} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group}</h2>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', replyBadgeClass(group))}>
                {threads.length}
              </span>
            </div>
            {threads.map((thread) => {
              const discussionId = thread.discussion ?? thread.id;
              const label = replyLabel(thread);
              return (
                <article key={`${thread.forum}-${discussionId}`} className="mf-card">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/forums/${discussionId}`} state={{ thread }} className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: thread.courseColor }} />
                        <span className="truncate">{thread.courseName}</span>
                        {thread.courseShortName && <span className="shrink-0 text-slate-400">· {thread.courseShortName}</span>}
                      </div>
                      <h2 className="text-base font-semibold text-slate-950">{thread.name || thread.subject}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Last by {thread.userfullname || 'Unknown'}</span>
                        {thread.timemodified && <span>{formatDistanceToNow(thread.timemodified * 1000, { addSuffix: true })}</span>}
                      </div>
                    </Link>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId((current) => (current === discussionId ? null : discussionId))}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                        title="Thread actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenuId === discussionId && (
                        <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-soft">
                          <a
                            href={absoluteMoodleUrl(baseUrl, `/mod/forum/discuss.php?d=${discussionId}`)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open in Moodle
                          </a>
                          <button
                            onClick={() => {
                              dismissDiscussion(discussionId);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                          >
                            <EyeOff className="h-4 w-4" />
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {thread.numreplies ?? 0} replies
                    </span>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', replyBadgeClass(label))}>
                      {label}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
