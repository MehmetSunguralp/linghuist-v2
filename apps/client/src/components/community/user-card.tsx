'use client';

import Link from 'next/link';
import * as React from 'react';
import CountryFlag from 'react-country-flag';

import { enStrings } from '@/config/en.strings';
import { useAuthStore } from '@/stores/auth-store';
import { imageSrcAfterSigning, resolveSignedStorageUrl } from '@/lib/storage-url';

import type { DiscoveryUser } from '@/types/community.types';
import { codeFromCountry, codeFromLanguage } from './utils';

const strings = enStrings.community;

function LanguageFlagBadge({ label }: { readonly label?: string }) {
  const code = codeFromLanguage(label);
  if (!code) {
    return (
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a3150] text-xs text-[#8798b4]"
        aria-label={strings.languageUnknown}
      >
        —
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a3150]"
      title={label}
    >
      <CountryFlag countryCode={code} svg style={{ width: '1rem', height: '1rem' }} />
    </span>
  );
}

export function CommunityUserCard({ user }: { readonly user: DiscoveryUser }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [avatar, setAvatar] = React.useState('/logo_small.webp');
  React.useEffect(() => {
    let active = true;
    async function resolveAvatar() {
      const rawPath = user.thumbnailUrl ?? user.avatarUrl ?? '';
      if (!rawPath) {
        if (active) setAvatar('/logo_small.webp');
        return;
      }
      const signed = await resolveSignedStorageUrl(rawPath, accessToken);
      if (!active) return;
      setAvatar(imageSrcAfterSigning(signed, rawPath) || '/logo_small.webp');
    }
    void resolveAvatar();
    return () => {
      active = false;
    };
  }, [user.thumbnailUrl, user.avatarUrl, accessToken, user.id]);
  const native = user.languagesKnown[0];
  const learning = user.languagesLearning[0];
  const nationalityCode = codeFromCountry(user.country);
  const profilePath = user.username ? `/profile/${user.username}` : `/profile/${user.id}`;

  return (
    <Link
      href={profilePath}
      className="rounded-2xl border border-white/5 bg-[#181e36] p-4 transition-colors hover:bg-[#1e2540]"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <div
            className={`relative h-full w-full overflow-hidden rounded-full ring-2 ${
              user.isOnline ? 'ring-emerald-500' : 'ring-zinc-500'
            }`}
          >
            <img src={avatar} alt={user.name ?? user.username ?? 'User'} className="h-full w-full object-cover" />
          </div>
          {nationalityCode ? (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[#181e36] bg-[#181e36] shadow-sm">
              <CountryFlag countryCode={nationalityCode} svg style={{ width: '0.7rem', height: '0.7rem' }} />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{user.name ?? user.username ?? 'Unknown user'}</h2>
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-[#141a32] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8798b4]">{strings.labelNative}</span>
          <LanguageFlagBadge label={native} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8798b4]">{strings.labelLearning}</span>
          <LanguageFlagBadge label={learning} />
        </div>
      </div>
    </Link>
  );
}
