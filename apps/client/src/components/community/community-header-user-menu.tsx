'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';

import { AUTH_LOGO_HEADER_SRC, AUTH_SIGN_IN_PATH } from '@/config/auth.constants';
import { enStrings } from '@/config/en.strings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { avatarUrlFromAccessToken } from '@/lib/jwt-utils';
import { useAuthStore } from '@/stores/auth-store';

const strings = enStrings.community;

export function CommunityHeaderUserMenu() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const avatarSrc = React.useMemo(
    () => avatarUrlFromAccessToken(accessToken) ?? AUTH_LOGO_HEADER_SRC,
    [accessToken],
  );

  function onLogout() {
    clearSession();
    router.replace(AUTH_SIGN_IN_PATH);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#181e36] py-0.5 pl-0.5 pr-2 outline-none transition-colors hover:bg-[#222941] focus-visible:ring-2 focus-visible:ring-[#00d4ff]/50"
        aria-label={strings.navProfileMenu}
      >
        <img
          src={avatarSrc}
          alt=""
          className="size-8 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9caec8]" aria-hidden />
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
