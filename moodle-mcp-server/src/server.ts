import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { Moodle, MoodleApiError, loginToMoodle } from './moodle';
import { resolveBaseUrl, resolveToken } from './validation';

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function handleMoodleError(error: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  const message = error instanceof MoodleApiError
    ? `Moodle API error: ${error.message}${error.errorcode ? ` (${error.errorcode})` : ''}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: formatJson(data) }] };
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

function extractMobileDeepLink(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Missing mobile login link');
  const hashValue = trimmed.includes('#') ? trimmed.split('#').slice(1).join('#') : '';
  const candidate = hashValue || trimmed;
  let decoded = candidate;
  for (let index = 0; index < 3; index += 1) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function parseMobileToken(input: string) {
  const deepLink = extractMobileDeepLink(input);
  const tokenMatch = deepLink.match(/(?:^|[/?#&:])token=([^&#]+)/);
  const encodedToken = tokenMatch?.[1];
  if (!encodedToken) throw new Error('Mobile login link does not contain a token');
  const parts = decodeBase64(encodedToken).split(':::');
  if (parts.length < 2 || !parts[1]) throw new Error('Mobile login token is invalid');
  return { siteId: parts[0], token: parts[1], privateToken: parts[2] };
}

// Shared optional auth schema
const authSchema = {
  baseUrl: z.string().optional().describe('Moodle base URL (defaults to MOODLE_BASE_URL env var)'),
  token: z.string().optional().describe('Moodle web service token (defaults to MOODLE_TOKEN env var)'),
};

function resolve(args: { baseUrl?: string; token?: string }) {
  return {
    baseUrl: resolveBaseUrl(args.baseUrl ?? null),
    token: resolveToken(args.token ?? null),
  };
}

export function createMoodleServer(): McpServer {
  const server = new McpServer({ name: 'moodle-mcp-server', version: '1.0.0' });

  server.registerTool(
    'login',
    {
      description: 'Authenticate with Moodle and obtain a web service token',
      inputSchema: z.object({
        baseUrl: z.string().describe('Moodle base URL'),
        username: z.string().describe('Moodle username'),
        password: z.string().describe('Moodle password'),
      }),
    },
    async ({ baseUrl, username, password }) => {
      try {
        const url = resolveBaseUrl(baseUrl);
        const result = await loginToMoodle(url, username, password);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'get_login_url',
    {
      description: 'Generate a Moodle mobile login URL. The user must open this URL in a browser, authenticate, then paste the resulting redirect link to extract_token.',
      inputSchema: z.object({
        baseUrl: z.string().describe('Moodle base URL'),
      }),
    },
    async ({ baseUrl }) => {
      try {
        const url = resolveBaseUrl(baseUrl);
        const passport = `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
        const launchUrl = new URL('/admin/tool/mobile/launch.php', url);
        launchUrl.search = new URLSearchParams({
          service: 'moodle_mobile_app',
          passport,
          urlscheme: 'web+moodlefeed',
          lang: 'en_us',
        }).toString();
        return ok({
          launchUrl: launchUrl.toString(),
          passport,
          instructions: [
            '1. Open the launchUrl in a browser',
            '2. Authenticate with your Moodle credentials',
            '3. The browser will redirect to a web+moodlefeed://... link',
            '4. Copy the full redirect URL and pass it to extract_token tool',
          ],
        });
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'extract_token',
    {
      description: 'Extract a web service token from a Moodle mobile login redirect link. Pass the full deep link URL you got after authenticating via get_login_url.',
      inputSchema: z.object({
        mobileLink: z.string().describe('The full mobile deep link (web+moodlefeed://... or moodlemobile://...)'),
      }),
    },
    async ({ mobileLink }) => {
      try {
        const result = parseMobileToken(mobileLink);
        return ok({
          ...result,
          instructions: 'Use the token value with any other tool by passing it as the "token" argument, or set MOODLE_BASE_URL and MOODLE_TOKEN env vars.',
        });
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'site_info',
    {
      description: 'Get information about the current user and site',
      inputSchema: z.object(authSchema),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.siteInfo(baseUrl, token);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'courses',
    {
      description: 'List all courses the user is enrolled in',
      inputSchema: z.object({
        ...authSchema,
        userId: z.number().describe('User ID'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.courses(baseUrl, token, args.userId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'assignments',
    {
      description: 'Get assignments for the specified courses',
      inputSchema: z.object({
        ...authSchema,
        courseIds: z.array(z.number()).describe('Array of course IDs'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.assignments(baseUrl, token, args.courseIds);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'completion',
    {
      description: 'Get activity completion status for a single course',
      inputSchema: z.object({
        ...authSchema,
        courseId: z.number().describe('Course ID'),
        userId: z.number().describe('User ID'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.completion(baseUrl, token, args.courseId, args.userId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'completions',
    {
      description: 'Get activity completion status for multiple courses',
      inputSchema: z.object({
        ...authSchema,
        courseIds: z.array(z.number()).describe('Array of course IDs'),
        userId: z.number().describe('User ID'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.completions(baseUrl, token, args.courseIds, args.userId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'forums',
    {
      description: 'Get forums for the specified courses',
      inputSchema: z.object({
        ...authSchema,
        courseIds: z.array(z.number()).describe('Array of course IDs'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.forums(baseUrl, token, args.courseIds);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'lessons',
    {
      description: 'Get lessons for the specified courses',
      inputSchema: z.object({
        ...authSchema,
        courseIds: z.array(z.number()).describe('Array of course IDs'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.lessons(baseUrl, token, args.courseIds);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'lesson_access_info',
    {
      description: 'Get access information for a specific lesson',
      inputSchema: z.object({
        ...authSchema,
        lessonId: z.number().describe('Lesson ID'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.lessonAccessInfo(baseUrl, token, args.lessonId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'discussions',
    {
      description: 'Get paginated discussions for a specific forum',
      inputSchema: z.object({
        ...authSchema,
        forumId: z.number().describe('Forum ID'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.discussions(baseUrl, token, args.forumId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'discussions_for_forums',
    {
      description: 'Get discussions for multiple forums at once',
      inputSchema: z.object({
        ...authSchema,
        forumIds: z.array(z.number()).describe('Array of forum IDs'),
        perPage: z.number().optional().describe('Results per forum (default: 20)'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.discussionsForForums(baseUrl, token, args.forumIds, args.perPage);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'posts',
    {
      description: 'Get all posts in a discussion',
      inputSchema: z.object({
        ...authSchema,
        discussionId: z.number().describe('Discussion ID'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.posts(baseUrl, token, args.discussionId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'posts_for_discussions',
    {
      description: 'Get posts for multiple discussions at once',
      inputSchema: z.object({
        ...authSchema,
        discussionIds: z.array(z.number()).describe('Array of discussion IDs'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.postsForDiscussions(baseUrl, token, args.discussionIds);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'reply',
    {
      description: 'Reply to a discussion post',
      inputSchema: z.object({
        ...authSchema,
        postId: z.number().describe('Parent post ID to reply to'),
        subject: z.string().describe('Reply subject'),
        message: z.string().describe('Reply message (HTML allowed)'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.reply(baseUrl, token, args.postId, args.subject, args.message);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'update_post',
    {
      description: 'Edit an existing discussion post',
      inputSchema: z.object({
        ...authSchema,
        postId: z.number().describe('Post ID to update'),
        subject: z.string().describe('New subject'),
        message: z.string().describe('New message (HTML allowed)'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.updatePost(baseUrl, token, args.postId, args.subject, args.message);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'unused_draft_item_id',
    {
      description: 'Get an unused draft item ID for file uploads',
      inputSchema: z.object(authSchema),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.unusedDraftItemId(baseUrl, token);
        return ok({ itemid: result });
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'submit_assignment',
    {
      description: 'Submit an assignment (text or file)',
      inputSchema: z.object({
        ...authSchema,
        assignmentId: z.number().describe('Assignment ID (not cmid)'),
        text: z.string().optional().describe('Submission text (for online text submissions)'),
        fileItemId: z.number().optional().describe('Draft item ID with uploaded file (for file submissions)'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.submitAssignment(baseUrl, token, args.assignmentId, args.text, args.fileItemId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'assignment_submission_status',
    {
      description: 'Get submission status for a single assignment',
      inputSchema: z.object({
        ...authSchema,
        assignmentId: z.number().describe('Assignment ID'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.assignmentSubmissionStatus(baseUrl, token, args.assignmentId);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  server.registerTool(
    'assignment_submission_statuses',
    {
      description: 'Get submission status for multiple assignments at once',
      inputSchema: z.object({
        ...authSchema,
        assignmentIds: z.array(z.number()).describe('Array of assignment IDs'),
      }),
    },
    async (args) => {
      try {
        const { baseUrl, token } = resolve(args);
        const result = await Moodle.assignmentSubmissionStatuses(baseUrl, token, args.assignmentIds);
        return ok(result);
      } catch (error) {
        return handleMoodleError(error);
      }
    },
  );

  return server;
}
