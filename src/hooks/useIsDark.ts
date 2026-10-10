import { useEffect, useState } from 'react';

/**
 * True while the app is rendering in dark mode.
 *
 * Reads the `dark` class on <html> instead of the `theme` setting directly, so
 * "system" resolves exactly the way the stylesheet does. Anything that paints
 * with raw values (FullCalendar events) needs this to stay in sync with CSS.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    // Also watch the OS preference — "system" theme flips the class without any
    // interaction, and the MutationObserver alone can miss that at mount.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', sync);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, []);

  return isDark;
}
