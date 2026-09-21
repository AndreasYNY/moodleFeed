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

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  href?: string;
}

interface NotificationsState {
  items: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'> & { id?: string }) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => void;
  dismissToast: (id: string) => void;
}

let toastCounter = 0;

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
      toasts: [],
      pushToast: (toast) =>
        set((state) => {
          const id = toast.id ?? `toast-${++toastCounter}`;
          return { toasts: [...state.toasts.slice(-4), { id, title: toast.title, body: toast.body, href: toast.href }] };
        }),
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'moodlefeed-notifications',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
