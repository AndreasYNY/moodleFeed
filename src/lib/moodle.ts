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

type BatchCall<T> = {
  id: string;
  fn: string;
  params?: Record<string, unknown>;
  map: (data: unknown) => T;
};

const batchChunkSize = 20;

async function moodleBatchCall<T>(baseUrl: string, token: string, calls: Array<BatchCall<T>>) {
  if (!calls.length) return [];

  const shouldUseProxyBatch =
    import.meta.env.VITE_MOODLE_PROXY === 'vercel' &&
    (import.meta.env.PROD || (import.meta.env.DEV && import.meta.env.VITE_MOODLE_BASE_URL));

  if (shouldUseProxyBatch) {
    const chunks = Array.from({ length: Math.ceil(calls.length / batchChunkSize) }, (_, index) =>
      calls.slice(index * batchChunkSize, (index + 1) * batchChunkSize),
    );
    const responses = await Promise.all(chunks.map((chunk) => fetch('/api/moodle/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: baseUrl.replace(/\/$/, ''),
        token,
        calls: chunk.map(({ id, fn, params }) => ({ id, fn, params })),
      }),
    })));

    const payloads = await Promise.all(responses.map(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new MoodleApiError(payload?.error || 'Moodle batch request failed');
      return payload;
    }));

    const resultById = new Map<string, { ok: boolean; data?: unknown; error?: string; errorcode?: string; exception?: string }>(
      payloads.flatMap((payload) => payload.results ?? [])
        .map((result: { id: string; ok: boolean; data?: unknown; error?: string; errorcode?: string; exception?: string }) => [result.id, result]),
    );

    return calls.map((call) => {
      const result = resultById.get(call.id);
      if (!result?.ok) throw new MoodleApiError(result?.error || 'Moodle batch item failed', result?.errorcode, result?.exception);
      return call.map(result.data);
    });
  }

  return Promise.all(calls.map((call) => moodleCall<unknown>(baseUrl, token, call.fn, call.params).then(call.map)));
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
    moodleBatchCall(baseUrl, token, courseIds.map((courseId) => ({
      id: String(courseId),
      fn: 'core_completion_get_activities_completion_status',
      params: { courseid: courseId, userid: userId },
      map: (data) => ({ courseId, data: data as { statuses: Array<{ cmid: number; state: number; timecompleted?: number }> } }),
    }))),

  forums: (baseUrl: string, token: string, courseIds: number[]) =>
    moodleCall<Forum[]>(baseUrl, token, 'mod_forum_get_forums_by_courses', { courseids: courseIds }),

  discussions: (baseUrl: string, token: string, forumId: number) =>
    moodleCall<{ discussions: Discussion[] }>(
      baseUrl,
      token,
      'mod_forum_get_forum_discussions_paginated',
      { forumid: forumId, sortby: 'timemodified', sortdirection: 'DESC', page: 0, perpage: 50 },
    ),

  discussionsBatch: (baseUrl: string, token: string, forumIds: number[]) =>
    moodleBatchCall(baseUrl, token, forumIds.map((forumId) => ({
      id: String(forumId),
      fn: 'mod_forum_get_forum_discussions_paginated',
      params: { forumid: forumId, sortby: 'timemodified', sortdirection: 'DESC', page: 0, perpage: 50 },
      map: (data) => ({ forumId, data: data as { discussions: Discussion[] } }),
    }))),

  posts: (baseUrl: string, token: string, discussionId: number) =>
    moodleCall<{ posts: ForumPost[] }>(baseUrl, token, 'mod_forum_get_discussion_posts', {
      discussionid: discussionId,
    }),

  postsBatch: (baseUrl: string, token: string, discussionIds: number[]) =>
    moodleBatchCall(baseUrl, token, discussionIds.map((discussionId) => ({
      id: String(discussionId),
      fn: 'mod_forum_get_discussion_posts',
      params: { discussionid: discussionId },
      map: (data) => ({ discussionId, data: data as { posts: ForumPost[] } }),
    }))),

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
        onlinetext_editor: text
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
    moodleBatchCall(baseUrl, token, assignmentIds.map((assignmentId) => ({
      id: String(assignmentId),
      fn: 'mod_assign_get_submission_status',
      params: { assignid: assignmentId },
      map: (data) => ({ assignmentId, data: data as AssignmentSubmissionStatus }),
    }))),
};
