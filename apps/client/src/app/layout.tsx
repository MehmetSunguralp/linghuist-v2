import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './global.css';
import { Geist } from 'next/font/google';

import { AppProviders } from '@/components/providers/app-providers';
import { AUTH_LOGO_HEADER_SRC, AUTH_PAGE_BG_HEX } from '@/config/auth.constants';
import { authStrings } from '@/config/auth.strings';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

/** SSR: default document metadata; segment layouts/pages can override `title` / `description`. */
export const metadata: Metadata = {
  applicationName: authStrings.brandName,
  title: {
    default: authStrings.metaTitle,
    template: `%s | ${authStrings.brandName}`,
  },
  description: authStrings.metaDescription,
  icons: {
    icon: AUTH_LOGO_HEADER_SRC,
    apple: AUTH_LOGO_HEADER_SRC,
  },
  appleWebApp: {
    capable: true,
    title: authStrings.brandName,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

/** SSR: mobile / PWA viewport + theme (Next.js `viewport` export, not `metadata.viewport`). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: AUTH_PAGE_BG_HEX,
  colorScheme: 'dark',
  viewportFit: 'cover',
};

/** Root Server Component: one client island (`AppProviders`) for browser-only UI; `children` stay RSC by default. */
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="min-h-dvh antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
