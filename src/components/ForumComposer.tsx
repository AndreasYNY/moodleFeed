import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Heading2, Heading3, Italic, Link, List, ListOrdered, Maximize2, Quote, Sparkles, Underline as UnderlineIcon } from 'lucide-react';
import { useState } from 'react';
import { getAiProvider } from '../lib/ai-providers';
import { buildAiPrompt, defaultAiPromptTemplate, type DiscussionContext } from '../lib/prompt-builder';
import { useSettingsStore } from '../store/settings';
import { AIPromptModal } from './AIPromptModal';

export function ForumComposer({
  onPost,
  context,
}: {
  onPost: (html: string) => Promise<void>;
  context: DiscussionContext;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [assembledPrompt, setAssembledPrompt] = useState('');
  const forumPromptTemplate = useSettingsStore((state) => state.forumPromptTemplate);
  const aiProviderId = useSettingsStore((state) => state.aiProvider);
  const aiProvider = getAiProvider(aiProviderId);
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

  function generateWithAi() {
    const prompt = buildAiPrompt(context, forumPromptTemplate || defaultAiPromptTemplate);
    setAssembledPrompt(prompt);
    setShowAiModal(true);
  }

  return (
    <div className={fullscreen ? 'fixed inset-3 z-50 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl md:inset-4 md:p-4' : 'sticky bottom-16 z-20 border-t border-slate-200 bg-white p-3 shadow-soft md:bottom-0 md:p-4'}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 md:gap-3">
        <div className="flex min-w-0 flex-wrap gap-1">
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
          onClick={generateWithAi}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-active px-3 py-2 text-sm font-semibold text-brand"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Generate with {aiProvider.name}</span>
          <span className="sm:hidden">{aiProvider.name}</span>
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 px-3 py-2">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
      <AIPromptModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        prompt={assembledPrompt}
        threadTitle={context.forumName}
        courseName={context.courseFullName}
        providerName={aiProvider.name}
        providerUrl={aiProvider.url}
      />
    </div>
  );
}
