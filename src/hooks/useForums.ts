import { useQuery } from '@tanstack/react-query';
import { Moodle } from '../lib/moodle';
import { courseColor } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import type { ForumThread } from '../types';
import { useCourses } from './useCourses';

export function useForums() {
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
    queryKey: ['discussions-batch', forumIds],
    queryFn: () => Moodle.discussionsBatch(baseUrl!, token!, forumIds),
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
    }));
  });

  const baseThreads = allThreads.filter((discussion) => {
    const discussionId = discussion.discussion ?? discussion.id;
    const discussionName = `${discussion.name ?? ''} ${discussion.subject ?? ''}`;
    if (hiddenCourseIdSet.has(discussion.courseId)) return false;
    if (dismissedIds.has(discussionId)) return false;
    return !compiledNameFilters.some((filter) => filter.test(discussionName));
  });

  const allDiscussionIds = allThreads.map((thread) => thread.discussion ?? thread.id);
  const postStatusesQuery = useQuery({
    queryKey: ['posts-batch', allDiscussionIds],
    queryFn: () => Moodle.postsBatch(baseUrl!, token!, allDiscussionIds),
    enabled: Boolean(baseUrl && token && userId && allDiscussionIds.length),
    staleTime: 5 * 60 * 1000,
  });
  const postsByDiscussion = new Map(
    postStatusesQuery.data?.map(({ discussionId, data }) => [discussionId, data.posts]) ?? [],
  );

  const threads = baseThreads.map((thread) => {
    const discussionId = thread.discussion ?? thread.id;
    const posts = postsByDiscussion.get(discussionId);
    const repliedFromPosts =
      posts?.some((post) => (post.author?.id ?? post.userid) === userId) ?? false;
    const rootPost = posts?.find((post) => !post.parentid || post.parentid === 0 || post.parentid === null);
    const acceptsReplies = rootPost?.capabilities?.reply ?? thread.acceptsReplies;

    return {
      ...thread,
      replied: thread.replied || repliedFromPosts,
      replyStatusLoading: postStatusesQuery.isLoading,
      acceptsReplies,
    };
  });

  return {
    ...forumsQuery,
    data: threads.sort((a, b) => (b.timemodified ?? 0) - (a.timemodified ?? 0)),
    isLoading: coursesQuery.isLoading || forumsQuery.isLoading || discussionsQuery.isLoading,
    error: coursesQuery.error || forumsQuery.error || discussionsQuery.error || postStatusesQuery.error,
  };
}
