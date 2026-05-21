import { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '../store/settings';

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '234 91 12';
  const value = Number.parseInt(normalized, 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

export function QuerySettingsBridge({ queryClient }: { queryClient: QueryClient }) {
  const syncInterval = useSettingsStore((state) => state.syncInterval);
  const theme = useSettingsStore((state) => state.theme);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const compactFeed = useSettingsStore((state) => state.compactFeed);

  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchInterval: syncInterval === 'manual' ? false : syncInterval * 60 * 1000,
      },
    });
  }, [queryClient, syncInterval]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--mf-brand', accentColor);
    root.style.setProperty('--mf-brand-rgb', hexToRgbChannels(accentColor));
    root.style.setProperty('--mf-active', `color-mix(in srgb, ${accentColor} 12%, white)`);
    root.style.setProperty('--mf-dark-bg', `color-mix(in srgb, ${accentColor} 10%, #0f172a)`);
    root.style.setProperty('--mf-dark-surface', `color-mix(in srgb, ${accentColor} 8%, #111827)`);
    root.style.setProperty('--mf-dark-muted', `color-mix(in srgb, ${accentColor} 10%, #1f2937)`);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.classList.toggle('compact', compactFeed);
  }, [compactFeed]);

  return null;
}
