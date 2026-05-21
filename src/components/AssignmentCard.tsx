import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import UnderlineExtension from '@tiptap/extension-underline';
import { Node } from '@tiptap/core';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  MoreHorizontal,
  Play,
  Quote,
  Send,
  Star,
  Strikethrough,
  Underline as UnderlineIcon,
  UploadCloud,
  X,
} from 'lucide-react';
import { DragEvent, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Moodle } from '../lib/moodle';
import { uploadMoodleFile } from '../lib/moodle-upload';
import { useAuthStore } from '../store/auth';

interface Assignment {
  id: number;
  cmid?: number;
  name: string;
  courseId: number;
  courseName: string;
  courseShortName: string;
  dueDate: number;
  submissionType: 'file' | 'onlinetext' | 'both';
  status: 'overdue' | 'dueSoon' | 'upcoming' | 'completed';
  isGraded: boolean;
  grade?: number | string;
  gradeMax?: number;
  gradeDisplay?: string;
  feedbackText?: string;
  briefFiles?: SubmittedFile[];
  submittedFiles?: SubmittedFile[];
  submittedText?: string;
  description?: string;
}

interface SubmittedFile {
  filename: string;
  filesize?: number;
  fileurl: string;
  mimetype?: string;
}

interface AssignmentCardProps {
  assignment: Assignment | LegacyAssignment;
  onSubmitFile?: (assignmentId: number, file: File) => Promise<void>;
  onSubmitText?: (assignmentId: number, html: string) => Promise<void>;
}

type LegacyAssignment = Partial<Assignment> & {
  id: number;
  name: string;
  cmid?: number;
  course?: number;
  courseColor?: string;
  courseName?: string;
  courseShortName?: string;
  duedate?: number;
  submitted?: boolean;
  graded?: boolean;
  gradingStatus?: string;
  grade?: number | string;
  gradeDisplay?: string;
  feedbackText?: string;
  briefFiles?: SubmittedFile[];
  submittedFiles?: SubmittedFile[];
  submittedText?: string;
  intro?: string;
  introfiles?: SubmittedFile[];
  configs?: Array<{ plugin: string; subtype: string; name: string; value: string }>;
  introattachments?: SubmittedFile[];
};

const statusStyles = {
  completed: { bg: '#EAF3DE', text: '#3B6D11' },
  upcoming: { bg: '#FAEEDA', text: '#854F0B' },
  dueSoon: { bg: '#FAEEDA', text: '#854F0B' },
  overdue: { bg: '#FCEBEB', text: '#A32D2D' },
};

const gradedStyle = { bg: '#E6F1FB', text: '#185FA5' };
const accentColor = 'var(--accent, var(--mf-brand))';

function getCourseColor(courseId: number) {
  const colors = [
    { dot: '#7C3AED', light: '#F3E8FF', text: '#6D28D9' },
    { dot: '#0F766E', light: '#CCFBF1', text: '#0F766E' },
    { dot: '#EA5B0C', light: '#FFF1EA', text: '#C2410C' },
    { dot: '#2563EB', light: '#DBEAFE', text: '#1D4ED8' },
    { dot: '#DB2777', light: '#FCE7F3', text: '#BE185D' },
  ];
  return colors[Math.abs(courseId) % colors.length];
}

function formatFileSize(bytes = 0): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDueDate(unix: number): string {
  if (!unix) return 'No due date';
  return `Due ${format(new Date(unix * 1000), 'MMM d, yyyy')} · ${format(new Date(unix * 1000), 'h:mm a')}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeHtml(html = ''): string {
  if (typeof window === 'undefined') return stripHtml(html);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, object, embed, form, input, button').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || (['href', 'src'].includes(name) && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return doc.body.innerHTML;
}

function extractYouTubeId(text: string): string | null {
  return text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
}

function extractYouTubeLinks(text: string) {
  return [...text.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}|youtu\.be\/[A-Za-z0-9_-]{11})[^\s<"]*/g)]
    .map((match) => ({ url: match[0], id: extractYouTubeId(match[0]) }))
    .filter((item): item is { url: string; id: string } => Boolean(item.id));
}

function formatGradeValue(grade?: number | string, gradeMax?: number, gradeDisplay?: string): string {
  if (gradeDisplay?.trim()) return gradeDisplay;
  if (typeof grade === 'number' && Number.isFinite(grade)) return `${grade.toFixed(2)} / ${gradeMax ?? 100}`;
  if (typeof grade === 'string' && grade.trim()) {
    const numericGrade = Number(grade);
    return Number.isFinite(numericGrade) ? `${numericGrade.toFixed(2)} / ${gradeMax ?? 100}` : grade;
  }
  return 'Released';
}

function buildAssignmentUrl(baseUrl: string | null, cmid?: number): string | null {
  if (!baseUrl || !cmid) return null;
  return `${baseUrl.replace(/\/$/, '')}/mod/assign/view.php?id=${cmid}`;
}

function isImageFile(file: SubmittedFile): boolean {
  return Boolean(file.mimetype?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.filename));
}

function moodleFileUrl(fileUrl: string, token: string | null): string {
  if (!token || /[?&]token=/.test(fileUrl)) return fileUrl;
  return `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

const YoutubeLite = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'iframe[data-youtube-lite]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      {
        ...HTMLAttributes,
        'data-youtube-lite': 'true',
        src: HTMLAttributes.src,
        frameborder: '0',
        allowfullscreen: 'true',
        class: 'aspect-video w-full rounded-lg',
      },
    ];
  },
  addCommands() {
    return {
      setYoutubeVideo:
        (options: { src: string }) =>
        ({ commands }: { commands: { insertContent: (value: unknown) => boolean } }) => {
          const id = extractYouTubeId(options.src);
          if (!id) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { src: `https://www.youtube.com/embed/${id}` },
          });
        },
    } as never;
  },
});

function normalizeAssignment(assignment: Assignment | LegacyAssignment): Assignment {
  const legacy = assignment as LegacyAssignment;
  const courseId = assignment.courseId ?? legacy.course ?? 0;
  const dueDate = assignment.dueDate ?? legacy.duedate ?? 0;
  const submitted = Boolean(assignment.status === 'completed' || legacy.submitted);
  const submissionType =
    assignment.submissionType ??
    (assignment.configs?.some((config) => config.plugin === 'file' && config.value === '1') &&
    assignment.configs?.some((config) => config.plugin === 'onlinetext' && config.value === '1')
      ? 'both'
      : assignment.configs?.some((config) => config.plugin === 'onlinetext' && config.value === '1')
        ? 'onlinetext'
        : 'file');

  return {
    id: assignment.id,
    cmid: assignment.cmid ?? legacy.cmid,
    name: assignment.name,
    courseId,
    courseName: assignment.courseName ?? 'Course',
    courseShortName: assignment.courseShortName ?? '',
    dueDate,
    submissionType,
    status: assignment.status ?? (submitted ? 'completed' : dueDate && dueDate * 1000 < Date.now() ? 'overdue' : 'upcoming'),
    isGraded: Boolean(assignment.isGraded || legacy.graded || legacy.gradingStatus === 'graded'),
    grade: assignment.grade ?? legacy.grade,
    gradeMax: assignment.gradeMax,
    gradeDisplay: assignment.gradeDisplay ?? legacy.gradeDisplay,
    feedbackText: assignment.feedbackText ?? legacy.feedbackText,
    briefFiles: assignment.briefFiles ?? legacy.briefFiles ?? legacy.introattachments ?? legacy.introfiles ?? [],
    submittedFiles: assignment.submittedFiles ?? legacy.submittedFiles ?? [],
    submittedText: assignment.submittedText ?? legacy.submittedText,
    description: assignment.description ?? legacy.intro,
  };
}

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-slate-200/80">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-medium text-slate-800"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

function Chip({
  children,
  icon,
  bg,
  text,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  bg: string;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: bg, color: text }}>
      {icon}
      {children}
    </span>
  );
}

function AttachmentList({ files, token }: { files?: SubmittedFile[]; token: string | null }) {
  if (!files?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {files.map((file) => {
        const fileUrl = moodleFileUrl(file.fileurl, token);
        return (
          <div key={`${file.fileurl}-${file.filename}`} className="overflow-hidden rounded-lg bg-slate-50">
            {isImageFile(file) && (
              <a href={fileUrl} target="_blank" rel="noreferrer" className="block border-b border-slate-200/80 bg-white">
                <img src={fileUrl} alt={file.filename} className="max-h-96 w-full object-contain" />
              </a>
            )}
            <div className="flex items-center gap-3 px-3 py-2">
              <FileText className="h-4 w-4" style={{ color: accentColor }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{file.filename}</div>
                <div className="text-xs text-slate-500">{formatFileSize(file.filesize)}</div>
              </div>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-white" title="Open file">
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AssignmentCard({ assignment: rawAssignment, onSubmitFile, onSubmitText }: AssignmentCardProps) {
  const assignment = useMemo(() => normalizeAssignment(rawAssignment), [rawAssignment]);
  const courseColor = getCourseColor(assignment.courseId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { baseUrl, token } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const submitted = assignment.status === 'completed';
  const youtubeLinks = extractYouTubeLinks(assignment.submittedText ?? '');

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      Link.configure({ openOnClick: false }),
      YoutubeLite,
      Placeholder.configure({
        placeholder: 'Write your online text submission… paste a YouTube link to embed it automatically.',
      }),
    ],
    editorProps: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const id = extractYouTubeId(text);
        if (!id) return false;
        event.preventDefault();
        view.dispatch(view.state.tr.insertText(''));
        (editor?.commands as unknown as { setYoutubeVideo: (options: { src: string }) => boolean })?.setYoutubeVideo({ src: text });
        return true;
      },
    },
    immediatelyRender: false,
  });

  const statusLabel = {
    overdue: 'Overdue',
    dueSoon: assignment.dueDate ? `Due ${formatDistanceToNow(assignment.dueDate * 1000, { addSuffix: true })}` : 'Due soon',
    upcoming: assignment.dueDate ? `Upcoming · ${formatDistanceToNow(assignment.dueDate * 1000, { addSuffix: true })}` : 'Upcoming',
    completed: assignment.dueDate ? `Completed · ${formatDistanceToNow(assignment.dueDate * 1000, { addSuffix: true })}` : 'Completed',
  }[assignment.status];

  const progressWidth = assignment.isGraded ? '100%' : submitted ? '50%' : '0%';
  const progressColor = assignment.isGraded ? '#639922' : accentColor;
  const gradeValue = formatGradeValue(assignment.grade, assignment.gradeMax, assignment.gradeDisplay);
  const assignmentUrl = buildAssignmentUrl(baseUrl, assignment.cmid);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (selectedFile && onSubmitFile) {
        await onSubmitFile(assignment.id, selectedFile);
      }
      const html = editor?.getHTML() ?? '';
      if ((assignment.submissionType === 'onlinetext' || assignment.submissionType === 'both') && onSubmitText && stripHtml(html)) {
        await onSubmitText(assignment.id, html);
      }
      if (!onSubmitFile && !onSubmitText && baseUrl && token) {
        let itemId: number | undefined;
        if (selectedFile) {
          const uploaded = await uploadMoodleFile(baseUrl, token, selectedFile);
          itemId = uploaded[0]?.itemid;
        }
        await Moodle.submitAssignment(baseUrl, token, assignment.id, stripHtml(html) ? html : undefined, itemId);
        await queryClient.invalidateQueries();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }

  async function pasteYoutubeFromClipboard() {
    const text = await navigator.clipboard.readText();
    if (extractYouTubeId(text)) {
      (editor?.commands as unknown as { setYoutubeVideo: (options: { src: string }) => boolean })?.setYoutubeVideo({ src: text });
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="min-w-0 flex-1 text-left">
            <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: courseColor.dot }} />
              <span className="truncate">{assignment.courseName}</span>
              {assignment.courseShortName && <span className="shrink-0">· {assignment.courseShortName}</span>}
            </div>
            <h3 className="text-[15px] font-medium leading-5 text-slate-950">{assignment.name}</h3>
          </button>
          <div className="flex items-center gap-1">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" title="Assignment actions">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-soft"
                >
                  {assignmentUrl ? (
                    <DropdownMenu.Item asChild className="outline-none">
                      <a
                        href={assignmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in Moodle
                      </a>
                    </DropdownMenu.Item>
                  ) : (
                    <DropdownMenu.Item disabled className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 outline-none">
                      <ExternalLink className="h-4 w-4" />
                      Link unavailable
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" title={expanded ? 'Hide fields' : 'Show fields'}>
              <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip bg="#F1F5F9" text="#475569" icon={<FileText className="h-3 w-3" />}>
            {assignment.submissionType === 'both' ? 'file + text' : assignment.submissionType === 'onlinetext' ? 'online text' : 'file upload'}
          </Chip>
          <Chip
            bg={statusStyles[assignment.status].bg}
            text={statusStyles[assignment.status].text}
            icon={assignment.status === 'completed' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          >
            {statusLabel}
          </Chip>
          {assignment.isGraded && (
            <Chip bg={gradedStyle.bg} text={gradedStyle.text} icon={<Star className="h-3 w-3" />}>
              Graded
            </Chip>
          )}
        </div>
      </div>

      <div className="h-[3px] bg-transparent">
        <div className="h-full transition-all" style={{ width: progressWidth, backgroundColor: progressColor }} />
      </div>

      {expanded && (submitted ? (
        <>
          <Section title="Assignment brief" defaultOpen={false}>
            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.description) }} />
            <AttachmentList files={assignment.briefFiles} token={token} />
          </Section>
          {(assignment.isGraded || assignment.feedbackText) && (
            <Section title="Grade & feedback" defaultOpen>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Grade</div>
                  <div className="mt-1 text-[22px] font-medium text-slate-950" dangerouslySetInnerHTML={{ __html: sanitizeHtml(gradeValue) }} />
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Feedback</div>
                  <div
                    className="prose prose-sm mt-1 max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.feedbackText || 'No feedback text.') }}
                  />
                </div>
              </div>
            </Section>
          )}
          <Section title="Submitted work" defaultOpen>
            <div className="space-y-2">
              {assignment.submittedFiles?.map((file) => (
                <div key={`${file.fileurl}-${file.filename}`} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <FileText className="h-4 w-4" style={{ color: accentColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{file.filename}</div>
                    <div className="text-xs text-slate-500">{formatFileSize(file.filesize)}</div>
                  </div>
                  <a href={moodleFileUrl(file.fileurl, token)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-white" title="Download">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))}
              {assignment.submittedText && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.submittedText) }} />
                </div>
              )}
              {youtubeLinks.map((link) => (
                <button key={link.url} type="button" onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')} className="block w-full overflow-hidden rounded-lg bg-slate-50 text-left">
                  <div className="relative">
                    <img src={`https://img.youtube.com/vi/${link.id}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
                    <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white" style={{ backgroundColor: accentColor }}>
                      <Play className="h-5 w-5 fill-current" />
                    </span>
                  </div>
                  <div className="px-3 py-2 text-xs text-slate-500">YouTube link detected — click to play</div>
                </button>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <>
          <Section title="Assignment brief" defaultOpen={false}>
            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.description) }} />
            <AttachmentList files={assignment.briefFiles} token={token} />
          </Section>
          <Section title="Submit your work" defaultOpen>
            <div className="space-y-3">
              {(assignment.submissionType === 'file' || assignment.submissionType === 'both') && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
                  {selectedFile ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <FileText className="h-4 w-4" style={{ color: accentColor }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">{selectedFile.name}</div>
                        <div className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</div>
                      </div>
                      <button type="button" onClick={() => setSelectedFile(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white" title="Remove file">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      className={`cursor-pointer rounded-xl border border-dashed p-5 text-center ${dragging ? 'bg-slate-100' : 'bg-slate-50'}`}
                      style={{ borderWidth: 1.5 }}
                    >
                      <UploadCloud className="mx-auto h-6 w-6 text-slate-400" />
                      <div className="mt-2 text-sm font-medium text-slate-700">Drop or choose a file</div>
                      <div className="mt-1 text-xs text-slate-500">PDF, DOCX, ZIP — max 20 MB</div>
                    </div>
                  )}
                </>
              )}

              {(assignment.submissionType === 'onlinetext' || assignment.submissionType === 'both') && (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
                    {[
                      { label: 'B', icon: <Bold className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleBold().run() },
                      { label: 'I', icon: <Italic className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleItalic().run() },
                      { label: 'U', icon: <UnderlineIcon className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleUnderline().run() },
                      { label: 'S', icon: <Strikethrough className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleStrike().run() },
                      { label: 'H1', text: 'H1', action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
                      { label: 'H2', text: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
                      { label: 'List', icon: <List className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleBulletList().run() },
                      { label: 'Ordered list', icon: <ListOrdered className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleOrderedList().run() },
                      { label: 'Link', icon: <LinkIcon className="h-3.5 w-3.5" />, action: () => {
                        const href = window.prompt('URL');
                        if (href) editor?.chain().focus().setLink({ href }).run();
                      } },
                      { label: 'Quote', icon: <Quote className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleBlockquote().run() },
                    ].map((item) => (
                      <button key={item.label} type="button" onClick={item.action} className="grid h-[26px] min-w-[26px] place-items-center rounded text-xs text-slate-600 hover:bg-white" title={item.label}>
                        {item.icon ?? item.text}
                      </button>
                    ))}
                    <button type="button" onClick={pasteYoutubeFromClipboard} className="ml-1 rounded px-2 py-1 text-xs font-medium" style={{ border: `0.5px solid ${accentColor}`, color: accentColor }}>
                      ▶ Paste YouTube link
                    </button>
                  </div>
                  <div className="min-h-20 px-3 py-2 text-[13px]">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDueDate(assignment.dueDate)}
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting' : 'Submit'}
                </button>
              </div>
            </div>
          </Section>
        </>
      ))}
    </article>
  );
}
