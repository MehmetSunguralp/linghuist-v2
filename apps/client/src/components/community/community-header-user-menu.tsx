'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, UserRound } from 'lucide-react';

import { AUTH_SIGN_IN_PATH } from '@/config/auth.constants';
import { enStrings } from '@/config/en.strings';
import { CommunityProfileAvatar } from '@/components/community/community-profile-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';

const strings = enStrings.community;

export function CommunityHeaderUserMenu() {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  function onLogout() {
    clearSession();
    router.replace(AUTH_SIGN_IN_PATH);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className="rounded-full outline-none ring-offset-2 ring-offset-[#0b1229] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00d4ff]/50"
        aria-label={strings.navProfileMenu}
      >
        <CommunityProfileAvatar className="size-8 ring-2 ring-white/10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/profile/me" className="flex items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0" />
            {strings.navMenuProfile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-300 focus:text-red-200"
          onClick={() => {
            onLogout();
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {strings.navMenuLogOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
