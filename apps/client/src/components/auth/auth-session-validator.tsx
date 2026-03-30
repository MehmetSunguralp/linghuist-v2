'use client';

/**
 * Client-only: reads tokens from the persisted store and `usePathname()` (not available on the server).
 * Runs beside RSC routes; does not make those routes “dynamic” at the segment level.
 */
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { AUTH_SIGN_IN_PATH } from '@/config/auth.constants';
import { isAccessTokenExpired } from '@/lib/jwt-utils';
import { pathRequiresAuth } from '@/lib/auth-routes';
import { useAuthStore } from '@/stores/auth-store';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Clears expired sessions and redirects off protected routes (covers long-lived tabs).
 */
export function AuthSessionValidator() {
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  const enforce = React.useCallback(() => {
    if (!hydrated) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      if (pathRequiresAuth(pathname)) {
        router.replace(AUTH_SIGN_IN_PATH);
      }
      return;
    }
    if (!isAccessTokenExpired(token)) return;
    useAuthStore.getState().clearSession();
    if (pathRequiresAuth(pathname)) {
      router.replace(AUTH_SIGN_IN_PATH);
    }
  }, [hydrated, pathname, router]);

  React.useEffect(() => {
    enforce();
  }, [enforce]);

  React.useEffect(() => {
    if (!hydrated) return;
    const id = globalThis.setInterval(enforce, CHECK_INTERVAL_MS);
    return () => globalThis.clearInterval(id);
  }, [hydrated, enforce]);

  React.useEffect(() => {
    if (!hydrated) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') enforce();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [hydrated, enforce]);

  return null;
}
