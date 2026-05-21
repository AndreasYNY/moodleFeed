import { stripHtml } from './utils';

export interface Post {
  authorName: string;
  authorId: number;
  body: string;
}

export interface DiscussionContext {
  courseFullName: string;
  courseShortName?: string;
  forumName: string;
  discussionId: number;
  threadUrl: string;
  forumPrompt: string;
  tutorPosts: Post[];
  studentPosts: Post[];
}

function clean(body: string) {
  return stripHtml(body);
}

export const defaultClaudePromptTemplate = `Help me write a Moodle forum reply. Use the course and forum context below, but do not mention that you are using a prompt, brief, evidence hierarchy, or drafting process.
Write like a real student: direct, natural, and specific. Avoid generic AI phrasing and avoid opening or closing paragraphs with filler transitions such as "Secara umum", "Dengan kata lain", "Pada dasarnya", "Intinya", "Jadi", or "Oleh karena itu".

Requirements:
- Keep paragraphs short and readable.
- Use teacher/tutor instructions and course material as the strongest evidence.
- Do your own online research before writing. Prioritize recent peer-reviewed academic papers, journal articles, conference papers, university publications, or reputable scholarly databases.
- Find a different angle from other students' replies. Do not follow their same structure, examples, argument order, phrasing, or conclusion too closely.
- Include APA-style sources under the heading "Sumber" when reliable source details are available.
- Do not cite student replies or the forum prompt itself in the reference list.

Return this structure:
Main reply:
Sumber:

---
Course: {courseFullName}
Course code: {courseShortName}
Thread title: {forumName} — {discussionId}
Thread URL: {threadUrl}

Forum prompt:
{forumPrompt}

Tutor/teacher context:
{tutorContext}

Student replies (context only — do not mirror their structure or examples):
{studentContext}`;

export function buildClaudePrompt(ctx: DiscussionContext, template = defaultClaudePromptTemplate): string {
  const tutorContext = ctx.tutorPosts.map((p) => `${p.authorName}: ${clean(p.body)}`).join('\n\n');
  const studentContext = ctx.studentPosts
    .map((p) => `- ${p.authorName}: ${clean(p.body).slice(0, 300)}...`)
    .join('\n');

  const replacements: Record<string, string> = {
    courseFullName: ctx.courseFullName,
    courseShortName: ctx.courseShortName ?? '',
    forumName: ctx.forumName,
    discussionId: String(ctx.discussionId),
    threadUrl: ctx.threadUrl,
    forumPrompt: clean(ctx.forumPrompt),
    tutorContext,
    studentContext,
  };

  return Object.entries(replacements).reduce(
    (prompt, [key, value]) => prompt.split(`{${key}}`).join(value),
    template || defaultClaudePromptTemplate,
  );
}
