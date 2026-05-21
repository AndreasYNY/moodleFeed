import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href?: string;
  createdAt: number;
  read: boolean;
}

interface NotificationsState {
  items: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'> & { id?: string }) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      items: [],
      addNotification: (item) =>
        set((state) => {
          const id = item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          if (state.items.some((existing) => existing.id === id)) return state;

          return {
            items: [
              {
                id,
                title: item.title,
                body: item.body,
                href: item.href,
                createdAt: Date.now(),
                read: false,
              },
              ...state.items,
            ].slice(0, 100),
          };
        }),
      markAllRead: () =>
        set((state) => ({
          items: state.items.map((item) => ({ ...item, read: true })),
        })),
      removeNotification: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearNotifications: () => set({ items: [] }),
    }),
    { name: 'moodlefeed-notifications' },
  ),
);
