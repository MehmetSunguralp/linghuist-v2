import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LoginSessionData } from '@/types/auth.types';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (tokens: LoginSessionData) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setSession: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),
      clearSession: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: 'linghuist-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
