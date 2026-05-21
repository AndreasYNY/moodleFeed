import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Heading2, Heading3, Italic, Link, List, ListOrdered, Maximize2, Quote, Sparkles, Underline as UnderlineIcon } from 'lucide-react';
import { useState } from 'react';
import { buildClaudePrompt, defaultClaudePromptTemplate, type DiscussionContext } from '../lib/prompt-builder';
import { useSettingsStore } from '../store/settings';

export function ForumComposer({
  onPost,
  context,
}: {
  onPost: (html: string) => Promise<void>;
  context: DiscussionContext;
}) {
  const [toast, setToast] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const forumPromptTemplate = useSettingsStore((state) => state.forumPromptTemplate);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your reply...' }),
    ],
    content: '',
    immediatelyRender: false,
  });

  const html = editor?.getHTML() ?? '';
  const text = editor?.getText() ?? '';

  const toolbar = [
    { icon: Bold, label: 'Bold', action: () => editor?.chain().focus().toggleBold().run() },
    { icon: Italic, label: 'Italic', action: () => editor?.chain().focus().toggleItalic().run() },
    { icon: UnderlineIcon, label: 'Underline', action: () => editor?.chain().focus().toggleUnderline().run() },
    { icon: ListOrdered, label: 'Ordered list', action: () => editor?.chain().focus().toggleOrderedList().run() },
    { icon: List, label: 'Bullet list', action: () => editor?.chain().focus().toggleBulletList().run() },
    { icon: Quote, label: 'Blockquote', action: () => editor?.chain().focus().toggleBlockquote().run() },
    { icon: Heading2, label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: 'H3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    {
      icon: Link,
      label: 'Link',
      action: () => {
        const url = window.prompt('URL');
        if (url) editor?.chain().focus().setLink({ href: url }).run();
      },
    },
  ];

  return (
    <div className={fullscreen ? 'fixed inset-4 z-50 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl' : 'sticky bottom-0 z-20 border-t border-slate-200 bg-white p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.06)]'}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {toolbar.map((item) => (
            <button key={item.label} onClick={item.action} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title={item.label}>
              <item.icon className="h-4 w-4" />
            </button>
          ))}
          <button onClick={() => setFullscreen((value) => !value)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(buildClaudePrompt(context, forumPromptTemplate || defaultClaudePromptTemplate));
            window.open('https://claude.ai', '_blank', 'noopener,noreferrer');
            setToast('Prompt copied!');
            window.setTimeout(() => setToast(''), 2200);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-active px-3 py-2 text-sm font-semibold text-brand"
        >
          <Sparkles className="h-4 w-4" />
          Generate with Claude
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 px-3 py-2">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{text.length} characters</span>
        <div className="flex gap-2">
          <button onClick={() => editor?.commands.clearContent()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
            Discard
          </button>
          <button
            onClick={async () => {
              await onPost(html);
              editor?.commands.clearContent();
            }}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
          >
            Post reply
          </button>
        </div>
      </div>
      {toast && <div className="absolute right-4 top-4 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white">{toast}</div>}
    </div>
  );
}
