import { Check, CircleCheck, Copy, ExternalLink, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  threadTitle: string;
  courseName: string;
  providerName: string;
  providerUrl: string;
}

export function AIPromptModal({
  isOpen,
  onClose,
  prompt,
  threadTitle,
  courseName,
  providerName,
  providerUrl,
}: AIPromptModalProps) {
  const [countDown, setCountDown] = useState(3);
  const [copyAgain, setCopyAgain] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  function clearTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    intervalRef.current = null;
    copyTimeoutRef.current = null;
  }

  function openProvider() {
    clearTimers();
    setCountDown(0);
    window.open(providerUrl, '_blank');
  }

  async function handleCopyAgain() {
    await navigator.clipboard.writeText(prompt).catch(() => {});
    setCopyAgain(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopyAgain(false), 1500);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .filter((element) => !element.hasAttribute('disabled'));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      return;
    }

    navigator.clipboard.writeText(prompt).catch(() => {});
    setCountDown(3);
    setCopyAgain(false);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    intervalRef.current = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearTimers();
          window.open(providerUrl, '_blank');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimers;
  }, [isOpen, prompt, providerUrl]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-3"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        className="flex max-h-[90vh] w-[540px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white text-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start gap-3 border-b border-slate-200/80 px-[18px] pb-3.5 pt-4">
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg bg-active text-brand">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div id="ai-modal-title" className="text-sm font-medium">Generate with {providerName}</div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              {threadTitle} · {courseName}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-[18px] mt-3.5 flex items-center gap-2 rounded-lg border border-brand/25 bg-active px-3 py-2.5 text-brand">
          <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1 text-xs leading-relaxed">
            <strong className="font-medium">Prompt copied to clipboard.</strong> {providerName} opens automatically. Paste and send.
          </div>
          {countDown > 0 && (
            <div className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-white">
              {countDown}s
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-[18px] pb-1.5 pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Assembled prompt
          </span>
          <button
            onClick={handleCopyAgain}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copyAgain ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copyAgain ? 'Copied!' : 'Copy again'}
          </button>
        </div>

        <div
          className="mx-[18px] h-[200px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-xs leading-relaxed text-slate-700"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {prompt}
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-slate-200/80 px-[18px] py-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Opening {providerName} in a new tab
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={openProvider}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open {providerName} now
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
