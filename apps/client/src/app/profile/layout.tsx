import type { ReactNode } from 'react';

import { AuthUserGate } from '@/components/auth/auth-user-gate';
import { AppDesktopHeader } from '@/components/navigation/app-desktop-header';

export default function ProfileLayout({ children }: { readonly children: ReactNode }) {
  return (
    <AuthUserGate>
      <AppDesktopHeader />
      <div className="md:pt-16">{children}</div>
    </AuthUserGate>
  );
}
