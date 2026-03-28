import Image from 'next/image';
import Link from 'next/link';

import { AUTH_HOME_PATH, AUTH_LOGO_HEADER_SRC } from '@/config/auth.constants';
import { authStrings } from '@/config/auth.strings';
import { cn } from '@/lib/utils';

type AuthHeaderProps = {
  className?: string;
};

export function AuthHeader({ className }: AuthHeaderProps) {
  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full bg-[#0B1229]/60 shadow-auth-header backdrop-blur-md',
        className,
      )}
    >
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Link
          href={AUTH_HOME_PATH}
          className="flex items-center gap-2 outline-none ring-primary-container/50 focus-visible:ring-2"
        >
          <Image
            src={AUTH_LOGO_HEADER_SRC}
            alt={authStrings.brandName}
            width={256}
            height={256}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/help"
            className="text-sm font-bold tracking-tight text-slate-400 transition-colors hover:text-[#00D4FF]"
          >
            {authStrings.help}
          </Link>
        </div>
      </div>
    </header>
  );
}
