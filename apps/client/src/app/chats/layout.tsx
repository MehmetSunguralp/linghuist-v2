import type { ReactNode } from 'react';

import { AuthUserGate } from '@/components/auth/auth-user-gate';
import { AppDesktopHeader } from '@/components/navigation/app-desktop-header';

export default function ChatsLayout({ children }: { readonly children: ReactNode }) {
  return (
    <AuthUserGate>
      <AppDesktopHeader activeItem="chats" />
      <div className="md:pt-16">{children}</div>
    </AuthUserGate>
  );
}
