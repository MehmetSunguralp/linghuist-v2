'use client';

import { Bell, MessageCircle, Rss, Users } from 'lucide-react';
import Link from 'next/link';

import { CommunityHeaderUserMenu } from '@/components/community/community-header-user-menu';
import { enStrings } from '@/config/en.strings';

type HeaderItem = 'community' | 'feed' | 'chats';

type AppDesktopHeaderProps = {
  readonly activeItem?: HeaderItem;
};

const strings = enStrings.community;

export function AppDesktopHeader({ activeItem }: AppDesktopHeaderProps) {
  const activeClass = 'text-[#00d4ff]';
  const inactiveClass = 'text-[#8ea0ba] transition-colors hover:text-white';

  return (
    <header className="fixed top-0 left-0 z-50 hidden w-full border-b border-white/5 bg-[#0b1229]/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/community" className="flex items-center gap-2 text-[#00d4ff]">
          <Users className="h-5 w-5" />
          <span className="text-xl font-bold">{enStrings.app.brandName}</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link
            href="/community"
            className={activeItem === 'community' ? `inline-flex items-center gap-1 ${activeClass}` : `inline-flex items-center gap-1 ${inactiveClass}`}
          >
            <Users className="h-4 w-4" />
            {strings.navCommunity}
          </Link>
          <button type="button" className={`inline-flex items-center gap-1 ${activeItem === 'feed' ? activeClass : inactiveClass}`}>
            <Rss className="h-4 w-4" />
            {strings.navFeed}
          </button>
          <Link href="/chats" className={`inline-flex items-center gap-1 ${activeItem === 'chats' ? activeClass : inactiveClass}`}>
            <MessageCircle className="h-4 w-4" />
            {strings.navChats}
          </Link>
          <button type="button" className={`inline-flex items-center gap-1 ${inactiveClass}`}>
            <Bell className="h-4 w-4" />
            {strings.navNotifications}
          </button>
          <CommunityHeaderUserMenu />
        </nav>
      </div>
    </header>
  );
}
