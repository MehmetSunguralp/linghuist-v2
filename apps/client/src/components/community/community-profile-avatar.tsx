'use client';

import * as React from 'react';
import { User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { avatarUrlFromAccessToken, initialsFromAccessToken } from '@/lib/jwt-utils';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

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

  const avatarUrl = React.useMemo(() => avatarUrlFromAccessToken(accessToken), [accessToken]);
  const initials = React.useMemo(() => initialsFromAccessToken(accessToken), [accessToken]);
  const showInitials = initials !== '?' && initials.length > 0;

  return (
    <Avatar className={cn(className)}>
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
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
