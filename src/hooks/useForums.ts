import { useQuery } from '@tanstack/react-query';
import { Moodle } from '../lib/moodle';
import { courseColor } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import type { ForumThread } from '../types';
import { useCourses } from './useCourses';

interface UseForumsOptions {
  checkReplies?: boolean;
  discussionsPerForum?: number;
  replyCheckLimit?: number;
}

export function useForums({ checkReplies = true, discussionsPerForum = 20, replyCheckLimit }: UseForumsOptions = {}) {
  const { baseUrl, token, userId } = useAuthStore();
  const { forumNameFilters, dismissedDiscussionIds, hiddenCourseIds } = useSettingsStore();
  const coursesQuery = useCourses();
  const hiddenCourseIdSet = new Set(hiddenCourseIds);
  const courses = coursesQuery.data ?? [];
  const courseIds = courses.map((course) => course.id);

  const forumsQuery = useQuery({
    queryKey: ['forums', courseIds],
    queryFn: () => Moodle.forums(baseUrl!, token!, courseIds),
    enabled: Boolean(baseUrl && token && courseIds.length),
  });

  const forumIds = (forumsQuery.data ?? []).map((forum) => forum.id);
  const discussionsQuery = useQuery({
    queryKey: ['discussions', forumIds, discussionsPerForum],
    queryFn: () => Moodle.discussionsForForums(baseUrl!, token!, forumIds, discussionsPerForum),
    enabled: Boolean(baseUrl && token && forumIds.length),
  });
  const discussionsByForum = new Map(
    discussionsQuery.data?.map(({ forumId, data }) => [forumId, data.discussions]) ?? [],
  );

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const forums = forumsQuery.data ?? [];
  const normalizedNameFilters = forumNameFilters.map((filter) => filter.trim()).filter(Boolean);
  const compiledNameFilters = normalizedNameFilters.flatMap((filter) => {
    try {
      return [new RegExp(filter, 'i')];
    } catch {
      return [];
    }
  });
  const dismissedIds = new Set(dismissedDiscussionIds);

  const allThreads: ForumThread[] = forums.flatMap((forum) => {
    const discussions = discussionsByForum.get(forum.id);
    if (!discussions) return [];
    const course = courseById.get(forum.course);
    return discussions.map((discussion) => ({
      ...discussion,
      forumName: forum.name,
      courseId: forum.course,
      courseName: course?.fullname ?? 'Course',
      courseShortName: course?.shortname,
      courseColor: courseColor(forum.course),
      replied: Boolean(userId) && (discussion.userid === userId || discussion.usermodified === userId),
      acceptsReplies: discussion.canreply !== false,
      dueDate: discussion.duedate ?? forum.duedate,
      cutoffDate: discussion.cutoffdate ?? forum.cutoffdate,
    }));
  });

  const baseThreads = allThreads.filter((discussion) => {
    const discussionId = discussion.discussion ?? discussion.id;
    const discussionName = `${discussion.name ?? ''} ${discussion.subject ?? ''}`;
    if (hiddenCourseIdSet.has(discussion.courseId)) return false;
    if (dismissedIds.has(discussionId)) return false;
    return !compiledNameFilters.some((filter) => filter.test(discussionName));
  });

  const sortedBaseThreads = [...baseThreads].sort((a, b) => (b.timemodified ?? 0) - (a.timemodified ?? 0));
  const checkedDiscussionIds = sortedBaseThreads
    .slice(0, replyCheckLimit ?? sortedBaseThreads.length)
    .map((thread) => thread.discussion ?? thread.id);
  const checkedDiscussionIdSet = new Set(checkedDiscussionIds);
  const postStatusesQuery = useQuery({
    queryKey: ['posts', checkedDiscussionIds],
    queryFn: () => Moodle.postsForDiscussions(baseUrl!, token!, checkedDiscussionIds),
    enabled: Boolean(checkReplies && baseUrl && token && userId && checkedDiscussionIds.length),
    staleTime: 5 * 60 * 1000,
  });
  const postsByDiscussion = new Map(
    postStatusesQuery.data?.map(({ discussionId, data }) => [discussionId, data.posts]) ?? [],
  );

  const threads = sortedBaseThreads.map((thread) => {
    const discussionId = thread.discussion ?? thread.id;
    const replyCheckEnabled = checkReplies && checkedDiscussionIdSet.has(discussionId);
    const posts = postsByDiscussion.get(discussionId);
    const repliedFromPosts =
      replyCheckEnabled && (posts?.some((post) => (post.author?.id ?? post.userid) === userId) ?? false);
    const rootPost = posts?.find((post) => !post.parentid || post.parentid === 0 || post.parentid === null);
    const acceptsReplies = rootPost?.capabilities?.reply ?? thread.acceptsReplies;

    return {
      ...thread,
      replied: thread.replied || repliedFromPosts,
      replyStatusLoading: replyCheckEnabled && postStatusesQuery.isLoading,
      acceptsReplies,
    };
  });

  return {
    ...forumsQuery,
    data: threads,
    isLoading: coursesQuery.isLoading || forumsQuery.isLoading || discussionsQuery.isLoading,
    error: coursesQuery.error || forumsQuery.error || discussionsQuery.error || (checkReplies ? postStatusesQuery.error : null),
  };
}
