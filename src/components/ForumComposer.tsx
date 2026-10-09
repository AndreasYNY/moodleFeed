import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, ChevronUp, Heading2, Heading3, Italic, Link, List, ListOrdered, Loader2, Maximize2, MessageSquarePlus, Minimize2, Quote, Sparkles, Underline as UnderlineIcon, X } from 'lucide-react';
import { useState } from 'react';
import { getAiProvider } from '../lib/ai-providers';
import { useI18n } from '../lib/i18n';
import { buildAiPrompt, defaultAiPromptTemplate, type DiscussionContext } from '../lib/prompt-builder';
import { useSettingsStore } from '../store/settings';
import { cn, editorSurfaceClass } from '../lib/utils';
import { AIPromptModal } from './AIPromptModal';

export function ForumComposer({
  onPost,
  context,
  isPosting,
}: {
  onPost: (html: string) => Promise<void>;
  context: DiscussionContext;
  isPosting?: boolean;
}) {
  const { t } = useI18n();
  const [fullscreen, setFullscreen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
      Placeholder.configure({ placeholder: t('composer.placeholder') }),
    ],
    content: '',
    editorProps: {
      // Capped height so a long draft scrolls inside the editor instead of
      // stretching the whole composer up over the thread on mobile.
      attributes: {
        class: editorSurfaceClass,
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const id = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
        if (!id) return false;
        event.preventDefault();
        view.dispatch(view.state.tr.insertText(''));
        (editor?.commands as unknown as { setYoutubeVideo: (options: { src: string }) => boolean })?.setYoutubeVideo({ src: text });
        return true;
      },
    },
    immediatelyRender: false,
  });

  const html = editor?.getHTML() ?? '';
  const text = editor?.getText() ?? '';
  const draftLength = text.trim().length;

  const toolbar = [
    { icon: Bold, label: t('editor.bold'), action: () => editor?.chain().focus().toggleBold().run() },
    { icon: Italic, label: t('editor.italic'), action: () => editor?.chain().focus().toggleItalic().run() },
    { icon: UnderlineIcon, label: t('editor.underline'), action: () => editor?.chain().focus().toggleUnderline().run() },
    { icon: ListOrdered, label: t('editor.orderedList'), action: () => editor?.chain().focus().toggleOrderedList().run() },
    { icon: List, label: t('editor.bulletList'), action: () => editor?.chain().focus().toggleBulletList().run() },
    { icon: Quote, label: t('editor.blockquote'), action: () => editor?.chain().focus().toggleBlockquote().run() },
    { icon: Heading2, label: t('editor.heading2'), action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: t('editor.heading3'), action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    {
      icon: Link,
      label: t('editor.link'),
      action: () => {
        const url = window.prompt(t('composer.linkPrompt'));
        if (url) editor?.chain().focus().setLink({ href: url }).run();
      },
    },
  ];

  function generateWithAi() {
    const prompt = buildAiPrompt(context, forumPromptTemplate || defaultAiPromptTemplate);
    setAssembledPrompt(prompt);
    setShowAiModal(true);
  }

  function collapse() {
    setFullscreen(false);
    setSheetOpen(false);
  }

  return (
    <>
      {/* Mobile: collapsed trigger. The full composer only appears on demand so the
          thread stays readable; on md+ the full panel is always rendered. */}
      {!sheetOpen && !fullscreen && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-16 left-0 right-0 z-20 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 px-4 py-3 text-left shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:hidden"
        >
          <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <MessageSquarePlus className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">{draftLength ? t('composer.continueDraft', { count: draftLength }) : t('composer.writeReply')}</span>
          </span>
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      )}

      <div
        className={cn(
          fullscreen
            ? 'fixed inset-0 z-50 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 p-3 shadow-2xl md:inset-4 md:p-4'
            : 'sticky bottom-16 z-20 border-t border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 p-3 shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:bottom-0 md:p-4',
          !fullscreen && (sheetOpen ? 'block' : 'hidden md:block'),
        )}
      >
        <div className="mb-3 flex flex-nowrap items-center justify-between gap-2 md:gap-3">
          <div className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {toolbar.map((item) => (
              <button key={item.label} onClick={item.action} className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-600/80 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800" title={item.label}>
                <item.icon className="h-4 w-4" />
              </button>
            ))}
            <button onClick={() => setFullscreen((value) => !value)} className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-600/80 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800" title={t('composer.fullscreen')}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={generateWithAi}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-active px-3 py-2 text-sm font-semibold text-brand"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">{t('composer.generateWith', { provider: aiProvider.name })}</span>
              <span className="sm:hidden">{aiProvider.name}</span>
            </button>
            <button
              type="button"
              onClick={collapse}
              className="rounded-lg border border-slate-200 dark:border-slate-600/80 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 md:hidden"
              title={t('composer.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-600/80 px-3 py-2">
          <EditorContent editor={editor} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('composer.characters', { count: text.length })}</span>
          <div className="flex gap-2">
            <button onClick={() => editor?.commands.clearContent()} className="rounded-lg border border-slate-200 dark:border-slate-600/80 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('composer.discard')}
            </button>
            <button
              onClick={async () => {
                await onPost(html);
                editor?.commands.clearContent();
              }}
              disabled={isPosting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPosting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPosting ? t('composer.posting') : t('composer.postReply')}
            </button>
          </div>
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
    </>
  );
}
