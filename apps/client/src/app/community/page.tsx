import type { Metadata } from 'next';

import { CommunityClient } from '@/components/community/community-client';
import { enStrings } from '@/config/en.strings';

export const metadata: Metadata = {
  title: enStrings.community.pageTitle,
  description: `${enStrings.app.brandName} ${enStrings.community.pageDescription}`,
};

export default function CommunityPage() {
  return <CommunityClient />;
}
