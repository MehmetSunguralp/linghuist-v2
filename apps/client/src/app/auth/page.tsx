import type { Metadata } from 'next';

import { AuthGuestGate } from '@/components/auth/auth-guest-gate';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { authStrings } from '@/config/auth.strings';

export const metadata: Metadata = {
  title: { absolute: authStrings.metaTitle },
  description: authStrings.metaDescription,
};

/** Server Component: marketing UI is RSC (`AuthSplitShell`); only the gate + form tree hydrate on the client. */
export default function AuthPage() {
  return (
    <AuthGuestGate>
      <AuthSplitShell />
    </AuthGuestGate>
  );
}
