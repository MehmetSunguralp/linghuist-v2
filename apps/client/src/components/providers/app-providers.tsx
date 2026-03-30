'use client';

/**
 * Root client boundary only. Holds hooks, browser APIs, and third-party widgets that need the document.
 * Keep new providers here so route/layout Server Components under `{children}` stay on the RSC tree.
 */
import NextTopLoader from 'nextjs-toploader';

import { AuthSessionValidator } from '@/components/auth/auth-session-validator';
import { PwaViewportNoZoom } from '@/components/providers/pwa-viewport-no-zoom';
import { Toaster } from '@/components/ui/sonner';

type AppProvidersProps = {
  readonly children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      <NextTopLoader
        color="#00d4ff"
        height={3}
        showSpinner={false}
        shadow="0 0 12px rgba(0, 212, 255, 0.35)"
        zIndex={99999}
      />
      <AuthSessionValidator />
      <PwaViewportNoZoom />
      <Toaster position="top-center" richColors closeButton />
      {children}
    </>
  );
}
