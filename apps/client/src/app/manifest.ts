import type { MetadataRoute } from 'next';

import {
  AUTH_PAGE_BG_HEX,
  PWA_MANIFEST_ICON_1024_SRC,
  PWA_MANIFEST_ICON_256_SRC,
} from '@/config/auth.constants';
import { authStrings } from '@/config/auth.strings';

/**
 * Web app manifest (served at `/manifest.webmanifest`).
 * Installability + standalone display for mobile; icons use existing public assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: authStrings.brandName,
    short_name: authStrings.brandName,
    description: authStrings.metaDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: AUTH_PAGE_BG_HEX,
    theme_color: AUTH_PAGE_BG_HEX,
    categories: ['education', 'lifestyle'],
    icons: [
      {
        src: PWA_MANIFEST_ICON_256_SRC,
        sizes: '256x256',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: PWA_MANIFEST_ICON_1024_SRC,
        sizes: '1024x1024',
        type: 'image/webp',
        purpose: 'any',
      },
    ],
  };
}
