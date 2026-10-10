export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600/80 bg-white dark:bg-gray-900 px-6 py-10 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-active text-2xl font-semibold text-brand">
        MF
      </div>
      <h2 className="text-base font-semibold text-slate-950 dark:text-slate-200">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}
