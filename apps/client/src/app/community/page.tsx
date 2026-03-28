import type { Metadata } from 'next';

import { authStrings } from '@/config/auth.strings';

export const metadata: Metadata = {
  title: 'Community',
  description: `${authStrings.brandName} community — signed-in area.`,
};

export default function CommunityPage() {
  return (
    <main className="min-h-dvh bg-background p-8 text-foreground">
      <h1 className="text-2xl font-semibold">Community</h1>
      <p className="mt-2 text-muted-foreground">This page is a placeholder. Implementation coming later.</p>
    </main>
  );
}
