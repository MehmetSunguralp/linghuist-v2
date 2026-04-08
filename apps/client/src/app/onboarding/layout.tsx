import type { ReactNode } from 'react';

import { AuthUserGate } from '@/components/auth/auth-user-gate';

export default function OnboardingLayout({ children }: { readonly children: ReactNode }) {
  return <AuthUserGate>{children}</AuthUserGate>;
}
