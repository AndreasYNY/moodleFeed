import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncInterval } from '../types';

type SettingValueKey = keyof Omit<
  SettingsState,
  'setSetting' | 'dismissDiscussion' | 'restoreDiscussion' | 'clearDismissedDiscussions'
>;

interface SettingsState {
  syncInterval: SyncInterval;
  theme: 'system' | 'light' | 'dark';
  accentColor: string;
  compactFeed: boolean;
  notifyBeforeMinutes: number;
  notifyOverdue: boolean;
  notifyNewAssignments: boolean;
  notifyForumReplies: boolean;
  notifyBrowser: boolean;
  forumNameFilters: string[];
  forumPromptTemplate: string;
  dismissedDiscussionIds: number[];
  setSetting: <K extends SettingValueKey>(key: K, value: SettingsState[K]) => void;
  dismissDiscussion: (discussionId: number) => void;
  restoreDiscussion: (discussionId: number) => void;
  clearDismissedDiscussions: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      syncInterval: 15,
      theme: 'system',
      accentColor: '#EA5B0C',
      compactFeed: false,
      notifyBeforeMinutes: 24 * 60,
      notifyOverdue: true,
      notifyNewAssignments: true,
      notifyForumReplies: true,
      notifyBrowser: false,
      forumNameFilters: [],
      forumPromptTemplate: '',
      dismissedDiscussionIds: [],
      setSetting: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      dismissDiscussion: (discussionId) =>
        set((state) => ({
          dismissedDiscussionIds: state.dismissedDiscussionIds.includes(discussionId)
            ? state.dismissedDiscussionIds
            : [...state.dismissedDiscussionIds, discussionId],
        })),
      restoreDiscussion: (discussionId) =>
        set((state) => ({
          dismissedDiscussionIds: state.dismissedDiscussionIds.filter((id) => id !== discussionId),
        })),
      clearDismissedDiscussions: () => set({ dismissedDiscussionIds: [] }),
    }),
    { name: 'moodlefeed-settings' },
  ),
);
