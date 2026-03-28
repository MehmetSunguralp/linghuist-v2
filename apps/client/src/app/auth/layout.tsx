import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';

import { cn } from '@/lib/utils';

import './auth-ui.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
});

/** Server layout: segment fonts + tokens only; no client hooks. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        plusJakarta.variable,
        'min-h-dvh font-plus-jakarta antialiased selection:bg-primary-container selection:text-on-primary',
      )}
    >
      {children}
    </div>
  );
}
