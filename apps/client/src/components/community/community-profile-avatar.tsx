'use client';

import * as React from 'react';
import { User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsFromAccessToken } from '@/lib/jwt-utils';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { resolveSignedStorageUrl } from '@/lib/storage-url';

let cachedOwnAvatarPath = '';
let cachedOwnAvatarResolved = '';

type CommunityProfileAvatarProps = {
  readonly className?: string;
  readonly imageClassName?: string;
  readonly fallbackClassName?: string;
};

export function CommunityProfileAvatar({
  className,
  imageClassName,
  fallbackClassName,
}: CommunityProfileAvatarProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = React.useState<string>(cachedOwnAvatarResolved);
  const initials = React.useMemo(() => initialsFromAccessToken(accessToken), [accessToken]);
  const showInitials = initials !== '?' && initials.length > 0;

  React.useEffect(() => {
    let active = true;
    async function resolveAvatar() {
      if (!accessToken) {
        if (active) setResolvedAvatarUrl('');
        cachedOwnAvatarPath = '';
        cachedOwnAvatarResolved = '';
        return;
      }
      const res = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { avatarUrl?: string | null; thumbnailUrl?: string | null };
      };
      const rawPath = json?.data?.thumbnailUrl ?? json?.data?.avatarUrl ?? '';
      if (rawPath && rawPath === cachedOwnAvatarPath && cachedOwnAvatarResolved) {
        if (active) setResolvedAvatarUrl(cachedOwnAvatarResolved);
        return;
      }
      const signed = await resolveSignedStorageUrl(rawPath, accessToken);
      if (!active) return;
      const next = signed || rawPath || '';
      setResolvedAvatarUrl(next);
      if (next) {
        cachedOwnAvatarPath = rawPath;
        cachedOwnAvatarResolved = next;
      }
    }
    void resolveAvatar();
    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <Avatar className={cn(className)}>
      {resolvedAvatarUrl ? (
        <AvatarImage
          src={resolvedAvatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className={cn('object-cover', imageClassName)}
        />
      ) : null}
      <AvatarFallback className={cn(fallbackClassName)}>
        {showInitials ? initials : <User className="size-[45%] text-[#9caec8]" aria-hidden />}
      </AvatarFallback>
    </Avatar>
  );
}
