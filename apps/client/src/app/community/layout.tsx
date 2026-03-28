import type { ReactNode } from 'react';

import { AuthUserGate } from '@/components/auth/auth-user-gate';

/** Server Component layout: passes RSC `children` through a single client auth boundary. */
export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <AuthUserGate>{children}</AuthUserGate>;
}
