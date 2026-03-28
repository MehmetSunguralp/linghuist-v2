'use client';

/**
 * Client-only: mirrors `AuthUserGate` — needs hydrated Zustand + `localStorage`.
 * Wraps server-rendered auth marketing UI (`children`) from `app/auth/page.tsx`.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';

import { AUTH_POST_LOGIN_PATH } from '@/config/auth.constants';
import { isAccessTokenExpired } from '@/lib/jwt-utils';
import { useAuthStore } from '@/stores/auth-store';

type AuthGuestGateProps = {
  readonly children: React.ReactNode;
};

/**
 * Blocks `/auth` for users with a persisted session (after zustand rehydration).
 */
export function AuthGuestGate({ children }: AuthGuestGateProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!hydrated || !accessToken) return;
    if (isAccessTokenExpired(accessToken)) {
      clearSession();
      return;
    }
    router.replace(AUTH_POST_LOGIN_PATH);
  }, [hydrated, accessToken, router, clearSession]);

  if (!hydrated || accessToken) {
    return (
      <div
        className="min-h-dvh bg-surface"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  return <>{children}</>;
}
