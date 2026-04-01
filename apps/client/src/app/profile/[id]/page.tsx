import type { Metadata } from 'next';

import { ProfileClient } from '@/components/profile/profile-client';
import { enStrings } from '@/config/en.strings';

type ProfilePageProps = {
  readonly params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: enStrings.profile.pageTitle,
  description: `${enStrings.app.brandName} ${enStrings.profile.pageDescription}`,
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  return <ProfileClient profileId={id} />;
}
