import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Edit3, ExternalLink, Heart, Quote } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDiscussion } from '../hooks/useDiscussion';
import { useAuthErrorRedirect } from '../hooks/auth-guard';
import { useI18n } from '../lib/i18n';
import { Moodle } from '../lib/moodle';
import { absoluteMoodleUrl, initials, sanitizeHtml, stripHtml } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import type { ForumPost, ForumThread } from '../types';
import { EmptyState } from './EmptyState';
import { ForumComposer } from './ForumComposer';
import { SkeletonCard } from './SkeletonCard';

function isTutor(post: ForumPost) {
  const name = `${post.author?.fullname ?? post.userfullname ?? ''} ${post.tags?.map((tag) => tag.rawname).join(' ') ?? ''}`.toLowerCase();
  return /teacher|tutor|lecturer|dosen|instructor/.test(name);
}

function postTime(post: ForumPost) {
  return post.created ?? post.timecreated ?? post.modified ?? post.timemodified ?? 0;
}

function splitPromptAndReplies(posts: ForumPost[]) {
  const sorted = [...posts].sort((a, b) => postTime(a) - postTime(b));
  const rootCandidates = sorted.filter((post) => !post.parentid || post.parentid === 0);
  const promptPost = rootCandidates[0] ?? sorted[0];
  const replies = sorted.filter((post) => post.id !== promptPost?.id);

  return { promptPost, replies };
}

export function DiscussionView({ discussionId }: { discussionId: number }) {
  const { t, dateLocale } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const location = useLocation();
  const thread = location.state?.thread as ForumThread | undefined;
  const { baseUrl, token, userId } = useAuthStore();
  const queryClient = useQueryClient();
  const postsQuery = useDiscussion(discussionId);
  useAuthErrorRedirect(postsQuery.error);

  const posts = useMemo(() => postsQuery.data?.posts ?? [], [postsQuery.data?.posts]);
  const { promptPost, replies } = useMemo(() => splitPromptAndReplies(posts), [posts]);
  const canReply = promptPost?.capabilities?.reply !== false;
  const myFirstReply = useMemo(
    () => replies.find((post) => (post.author?.id ?? post.userid) === userId),
    [replies, userId],
  );
  const visibleReplies = showAll ? replies : replies.slice(0, 5);

  const replyMutation = useMutation({
    mutationFn: (message: string) =>
      Moodle.reply(baseUrl!, token!, promptPost?.id ?? discussionId, `Re: ${thread?.name ?? t('common.forumReply')}`, message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts', discussionId] }),
  });

  const editMutation = useMutation({
    mutationFn: (post: ForumPost) =>
      Moodle.updatePost(baseUrl!, token!, post.id, post.subject ?? `Re: ${thread?.name ?? t('common.forumReply')}`, editingMessage),
    onSuccess: () => {
      setEditingPostId(null);
      setEditingMessage('');
      queryClient.invalidateQueries({ queryKey: ['posts', discussionId] });
    },
  });

  function scrollToMyAnswer() {
    if (!myFirstReply) return;
    setShowAll(true);
    window.setTimeout(() => {
      document.getElementById(`post-${myFirstReply.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  const promptContext = useMemo(
    () => ({
      courseFullName: thread?.courseName ?? t('common.course'),
      courseShortName: thread?.courseShortName,
      forumName: thread?.name ?? thread?.forumName ?? t('common.forumThread'),
      discussionId,
      threadUrl: absoluteMoodleUrl(baseUrl, `/mod/forum/discuss.php?d=${discussionId}`),
      forumPrompt: promptPost?.message ?? thread?.message ?? '',
      tutorPosts: replies.filter(isTutor).map((post) => ({
        authorName: post.author?.fullname ?? post.userfullname ?? t('discussion.tutor'),
        authorId: post.author?.id ?? post.userid ?? 0,
        body: post.message ?? '',
      })),
      studentPosts: replies.filter((post) => !isTutor(post)).map((post) => ({
        authorName: post.author?.fullname ?? post.userfullname ?? t('discussion.student'),
        authorId: post.author?.id ?? post.userid ?? 0,
        body: post.message ?? '',
      })),
    }),
    [baseUrl, discussionId, promptPost?.message, replies, thread, t],
  );

  if (postsQuery.isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)}</div>;
  }

  if (!posts.length) return <EmptyState title={t('discussion.unavailableTitle')} body={t('discussion.unavailableBody')} />;

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      <div className="flex-1 space-y-4 p-3 md:p-6">
        <article className="mf-card border-brand/25">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 text-xs font-semibold text-brand">{t('discussion.threadPrompt')}</div>
              <h2 className="break-words text-base font-semibold text-slate-950 md:text-lg">{promptPost.subject ?? thread?.name}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={absoluteMoodleUrl(baseUrl, `/mod/forum/discuss.php?d=${discussionId}`)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                title={t('discussion.openInMoodle')}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(promptPost.message) }}
          />
        </article>

        <div className="space-y-3">
          {visibleReplies.map((post) => {
            const tutor = isTutor(post);
            const mine = (post.author?.id ?? post.userid) === userId;
            const canEdit = mine && post.capabilities?.edit !== false;
            const author = post.author?.fullname ?? post.userfullname ?? t('common.unknown');
            return (
              <article id={`post-${post.id}`} key={post.id} className={`mf-card scroll-mt-20 ${tutor ? 'border-l-4 border-l-brand' : ''}`}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{initials(author)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words text-sm font-semibold text-slate-950">{author}</span>
                        {mine && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {t('discussion.you')}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tutor ? 'bg-active text-brand' : 'bg-slate-100 text-slate-600'}`}>
                          {tutor ? t('discussion.tutor') : t('discussion.student')}
                        </span>
                      </div>
                      {postTime(post) > 0 && <div className="text-xs text-slate-500">{formatDistanceToNow(postTime(post) * 1000, { addSuffix: true, locale: dateLocale })}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mine && (
                      <button
                        onClick={() => {
                          setEditingPostId(post.id);
                          setEditingMessage(post.message ?? '');
                        }}
                        disabled={!canEdit}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title={canEdit ? t('discussion.editReply') : t('discussion.editingClosed')}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    <button className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title={t('discussion.quote')}>
                      <Quote className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {editingPostId === post.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={stripHtml(editingMessage)}
                      onChange={(event) => setEditingMessage(event.target.value)}
                      className="mf-focus min-h-36 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => editMutation.mutate(post)}
                        disabled={editMutation.isPending}
                        className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {editMutation.isPending ? t('discussion.saving') : t('discussion.saveEdit')}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPostId(null);
                          setEditingMessage('');
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                      >
                        {t('discussion.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.message) }}
                  />
                )}
                <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
                  <Heart className="h-3.5 w-3.5" />
                  {post.rating ?? 0}
                </div>
              </article>
            );
          })}
        </div>

        {replies.length > 5 && !showAll && (
          <button onClick={() => setShowAll(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
            {t('discussion.showMore', { count: replies.length - 5 })}
          </button>
        )}
      </div>
      {myFirstReply && (
        <button
          onClick={scrollToMyAnswer}
          className="fixed bottom-[440px] right-4 z-30 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 md:bottom-[300px] md:right-6"
        >
          {t('discussion.myAnswer')}
        </button>
      )}
      {canReply ? (
        <ForumComposer
          context={promptContext}
          onPost={async (html) => {
            await replyMutation.mutateAsync(html);
          }}
        />
      ) : (
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t('discussion.closed')}
          </div>
        </div>
      )}
    </div>
  );
}
