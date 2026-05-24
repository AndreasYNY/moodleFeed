import type { Assignment, AssignmentSubmissionStatus, Course, Discussion, Forum, ForumPost, SiteInfo } from '../types';
import { moodleProxyHeaders, moodleRequestUrl } from './utils';

export class MoodleApiError extends Error {
  errorcode?: string;
  exception?: string;

  constructor(message: string, errorcode?: string, exception?: string) {
    super(message);
    this.name = 'MoodleApiError';
    this.errorcode = errorcode;
    this.exception = exception;
  }
}

function encodeParams(params: Record<string, unknown>, prefix?: string, body = new URLSearchParams()) {
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const paramKey = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          encodeParams(item as Record<string, unknown>, `${paramKey}[${index}]`, body);
        } else {
          body.append(`${paramKey}[${index}]`, String(item));
        }
      });
      return;
    }

    if (typeof value === 'object') {
      encodeParams(value as Record<string, unknown>, paramKey, body);
      return;
    }

    body.append(paramKey, String(value));
  });

  return body;
}

async function parseMoodleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new MoodleApiError(response.statusText || 'Moodle request failed');
  }

  if (data?.exception || data?.errorcode) {
    throw new MoodleApiError(data.message || 'Moodle API error', data.errorcode, data.exception);
  }

  return data as T;
}

export async function loginToMoodle(baseUrl: string, username: string, password: string) {
  const body = new URLSearchParams({
    username,
    password,
    service: 'moodle_mobile_app',
  });
  const response = await fetch(moodleRequestUrl(baseUrl, '/login/token.php'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...moodleProxyHeaders(baseUrl) },
    body,
  });
  return parseMoodleResponse<{ token: string; privatetoken?: string }>(response);
}

export async function moodleCall<T>(
  baseUrl: string,
  token: string,
  fn: string,
  params: Record<string, unknown> = {},
) {
  const response = await fetch(moodleRequestUrl(baseUrl, '/webservice/rest/server.php'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...moodleProxyHeaders(baseUrl) },
    body: encodeParams({
      wstoken: token,
      wsfunction: fn,
      moodlewsrestformat: 'json',
      ...params,
    }),
  });

  return parseMoodleResponse<T>(response);
}

export const Moodle = {
  siteInfo: (baseUrl: string, token: string) =>
    moodleCall<SiteInfo>(baseUrl, token, 'core_webservice_get_site_info'),

  courses: (baseUrl: string, token: string, userId: number) =>
    moodleCall<Course[]>(baseUrl, token, 'core_enrol_get_users_courses', { userid: userId }),

  assignments: (baseUrl: string, token: string, courseIds: number[]) =>
    moodleCall<{ courses: Array<{ id: number; fullname: string; assignments: Assignment[] }> }>(
      baseUrl,
      token,
      'mod_assign_get_assignments',
      { courseids: courseIds },
    ),

  completion: (baseUrl: string, token: string, courseId: number, userId: number) =>
    moodleCall<{ statuses: Array<{ cmid: number; state: number; timecompleted?: number }> }>(
      baseUrl,
      token,
      'core_completion_get_activities_completion_status',
      { courseid: courseId, userid: userId },
    ),

  completions: (baseUrl: string, token: string, courseIds: number[], userId: number) =>
    Promise.all(courseIds.map((courseId) =>
      moodleCall<{ statuses: Array<{ cmid: number; state: number; timecompleted?: number }> }>(
        baseUrl,
        token,
        'core_completion_get_activities_completion_status',
        { courseid: courseId, userid: userId },
      ).then((data) => ({ courseId, data })),
    )),

  forums: (baseUrl: string, token: string, courseIds: number[]) =>
    moodleCall<Forum[]>(baseUrl, token, 'mod_forum_get_forums_by_courses', { courseids: courseIds }),

  discussions: (baseUrl: string, token: string, forumId: number) =>
    moodleCall<{ discussions: Discussion[] }>(
      baseUrl,
      token,
      'mod_forum_get_forum_discussions_paginated',
      { forumid: forumId, sortby: 'timemodified', sortdirection: 'DESC', page: 0, perpage: 50 },
    ),

  discussionsForForums: (baseUrl: string, token: string, forumIds: number[], perPage = 20) =>
    Promise.all(forumIds.map((forumId) =>
      moodleCall<{ discussions: Discussion[] }>(
        baseUrl,
        token,
        'mod_forum_get_forum_discussions_paginated',
        { forumid: forumId, sortby: 'timemodified', sortdirection: 'DESC', page: 0, perpage: perPage },
      ).then((data) => ({ forumId, data })),
    )),

  posts: (baseUrl: string, token: string, discussionId: number) =>
    moodleCall<{ posts: ForumPost[] }>(baseUrl, token, 'mod_forum_get_discussion_posts', {
      discussionid: discussionId,
    }),

  postsForDiscussions: (baseUrl: string, token: string, discussionIds: number[]) =>
    Promise.all(discussionIds.map((discussionId) =>
      moodleCall<{ posts: ForumPost[] }>(baseUrl, token, 'mod_forum_get_discussion_posts', {
        discussionid: discussionId,
      }).then((data) => ({ discussionId, data })),
    )),

  reply: (baseUrl: string, token: string, postId: number, subject: string, message: string) =>
    moodleCall<{ postid: number; warnings?: unknown[] }>(baseUrl, token, 'mod_forum_add_discussion_post', {
      postid: postId,
      subject,
      message,
    }),

  updatePost: (baseUrl: string, token: string, postId: number, subject: string, message: string) =>
    moodleCall<{ status?: boolean; warnings?: unknown[] }>(baseUrl, token, 'mod_forum_update_discussion_post', {
      postid: postId,
      subject,
      message,
    }),

  unusedDraftItemId: (baseUrl: string, token: string) =>
    moodleCall<number | { itemid?: number }>(baseUrl, token, 'core_files_get_unused_draft_itemid')
      .then((data) => {
        const itemId = typeof data === 'number' ? data : data.itemid;
        if (!itemId) throw new MoodleApiError('Moodle did not return a draft item id');
        return itemId;
      }),

  submitAssignment: (
    baseUrl: string,
    token: string,
    assignmentId: number,
    text?: string,
    fileItemId?: number,
  ) =>
    moodleCall<{ warnings?: unknown[] }>(baseUrl, token, 'mod_assign_save_submission', {
      assignmentid: assignmentId,
      plugindata: {
        onlinetext_editor: text !== undefined
          ? { text, format: 1, itemid: 0 }
          : undefined,
        files_filemanager: fileItemId,
      },
    }),

  assignmentSubmissionStatus: (baseUrl: string, token: string, assignmentId: number) =>
    moodleCall<AssignmentSubmissionStatus>(baseUrl, token, 'mod_assign_get_submission_status', {
      assignid: assignmentId,
    }),

  assignmentSubmissionStatuses: (baseUrl: string, token: string, assignmentIds: number[]) =>
    Promise.all(assignmentIds.map((assignmentId) =>
      moodleCall<AssignmentSubmissionStatus>(baseUrl, token, 'mod_assign_get_submission_status', {
        assignid: assignmentId,
      }).then((data) => ({ assignmentId, data })),
    )),
};
