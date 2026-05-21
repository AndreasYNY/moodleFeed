import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SiteInfo } from '../types';

interface AuthState {
  token: string | null;
  baseUrl: string | null;
  userId: number | null;
  userFullName: string | null;
  userEmail: string | null;
  login: (baseUrl: string, token: string, userInfo: SiteInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      baseUrl: null,
      userId: null,
      userFullName: null,
      userEmail: null,
      login: (baseUrl, token, userInfo) =>
        set({
          baseUrl,
          token,
          userId: userInfo.userid,
          userFullName: userInfo.fullname,
          userEmail: userInfo.useremail ?? null,
        }),
      logout: () =>
        set({
          token: null,
          baseUrl: null,
          userId: null,
          userFullName: null,
          userEmail: null,
        }),
    }),
    { name: 'moodlefeed-auth' },
  ),
);
