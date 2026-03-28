'use client';

/**
 * Client-only: session tokens are read from `localStorage` after Zustand rehydration (no SSR secret).
 * Server-rendered `children` still ship as RSC payload; this gate swaps to a loading shell until hydrated,
 * then either renders children or redirects to sign-in.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';

import { AUTH_SIGN_IN_PATH } from '@/config/auth.constants';
import { isAccessTokenExpired } from '@/lib/jwt-utils';
import { useAuthStore } from '@/stores/auth-store';

type AuthUserGateProps = {
  readonly children: React.ReactNode;
};

/** Blocks protected segments until a non-expired access token exists (after zustand hydration). */
export function AuthUserGate({ children }: AuthUserGateProps) {
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
    if (!hydrated) return;
    if (!accessToken || isAccessTokenExpired(accessToken)) {
      if (accessToken && isAccessTokenExpired(accessToken)) {
        clearSession();
      }
      router.replace(AUTH_SIGN_IN_PATH);
    }
  }, [hydrated, accessToken, router, clearSession]);

  const blocked = !hydrated || !accessToken || isAccessTokenExpired(accessToken);

  if (blocked) {
    return (
      <div className="min-h-dvh bg-surface" aria-busy="true" aria-label="Loading" />
    );
  }

  return <>{children}</>;
}
