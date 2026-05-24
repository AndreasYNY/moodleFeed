import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, EyeOff, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForums } from '../hooks/useForums';
import { useAuthErrorRedirect } from '../hooks/auth-guard';
import { useI18n, type I18nKey } from '../lib/i18n';
import { absoluteMoodleUrl, cn } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import type { ForumThread } from '../types';
import { EmptyState } from './EmptyState';
import { SkeletonCard } from './SkeletonCard';

const groups = ['notReplied', 'checking', 'replied', 'closed'] as const;
const filters = ['all', ...groups] as const;
const pageSize = 20;
const replyLabels: Record<(typeof groups)[number], I18nKey> & { all: I18nKey } = {
  all: 'forums.filter.all',
  notReplied: 'forums.status.notReplied',
  checking: 'forums.status.checking',
  replied: 'forums.status.replied',
  closed: 'forums.status.closed',
};

function replyLabel(thread: ForumThread) {
  if (thread.replyStatusLoading) return 'checking';
  if (thread.replied) return 'replied';
  if (thread.acceptsReplies === false) return 'closed';
  return 'notReplied';
}

function replyBadgeClass(label: ReturnType<typeof replyLabel>) {
  if (label === 'replied') return 'bg-emerald-50 text-emerald-700';
  if (label === 'notReplied') return 'bg-red-50 text-red-700';
  if (label === 'closed') return 'bg-slate-100 text-slate-600';
  return 'bg-active text-brand';
}

export function ForumFeed() {
  const { t, dateLocale } = useI18n();
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const query = useForums({ replyCheckLimit: visibleCount });
  const baseUrl = useAuthStore((state) => state.baseUrl);
  const dismissDiscussion = useSettingsStore((state) => state.dismissDiscussion);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  useAuthErrorRedirect(query.error);

  const threads = query.data ?? [];
  const filteredThreads = threads.filter((thread) => filter === 'all' || replyLabel(thread) === filter);
  const visibleThreads = filteredThreads.slice(0, visibleCount);
  const hasMore = visibleCount < filteredThreads.length;
  const counts = filters.reduce<Record<string, number>>((acc, item) => {
    acc[item] = item === 'all' ? threads.length : threads.filter((thread) => replyLabel(thread) === item).length;
    return acc;
  }, {});

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((current) => Math.min(current + pageSize, filteredThreads.length));
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredThreads.length, hasMore]);

  if (query.isLoading) {
    return <div className="space-y-3">{Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}</div>;
  }

  if (!threads.length) {
    return <EmptyState title={t('forums.emptyTitle')} body={t('forums.emptyBody')} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => {
              setFilter(item);
              setVisibleCount(pageSize);
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-slate-200',
              filter === item ? 'bg-brand text-white ring-brand' : 'bg-white text-slate-600',
            )}
          >
            {t(replyLabels[item])}
            <span className="ml-1 opacity-75">{counts[item] ?? 0}</span>
          </button>
        ))}
      </div>

      {!filteredThreads.length && (
        <EmptyState title={t('forums.emptyTitle')} body={t('forums.emptyFilterBody')} />
      )}

      {groups.map((group) => {
        const threads = visibleThreads.filter((thread) => replyLabel(thread) === group);
        if (!threads.length) return null;

        return (
          <section key={group} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t(replyLabels[group])}</h2>
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
                      <h2 className="break-words text-base font-semibold text-slate-950">{thread.name || thread.subject}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{t('forums.lastBy', { name: thread.userfullname || t('common.unknown') })}</span>
                        {thread.timemodified && <span>{formatDistanceToNow(thread.timemodified * 1000, { addSuffix: true, locale: dateLocale })}</span>}
                      </div>
                    </Link>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId((current) => (current === discussionId ? null : discussionId))}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                        title={t('forums.threadActions')}
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
                            {t('forums.openInMoodle')}
                          </a>
                          <button
                            onClick={() => {
                              dismissDiscussion(discussionId);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                          >
                            <EyeOff className="h-4 w-4" />
                            {t('forums.dismiss')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t('forums.replies', { count: thread.numreplies ?? 0 })}
                    </span>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', replyBadgeClass(label))}>
                      {t(replyLabels[label])}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}

      {hasMore && (
        <div ref={loadMoreRef} className="flex flex-wrap items-center justify-center gap-3 py-2">
          <span className="text-xs font-medium text-slate-500">
            {t('forums.showing', { shown: Math.min(visibleCount, filteredThreads.length), total: filteredThreads.length })}
          </span>
        </div>
      )}
    </div>
  );
}
