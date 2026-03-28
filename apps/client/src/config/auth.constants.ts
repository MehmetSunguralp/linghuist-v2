/** Marketing / logged-out home. */
export const AUTH_HOME_PATH = '/' as const;

/** Protected routes redirect here when the session is missing or expired. */
export const AUTH_SIGN_IN_PATH = '/auth' as const;

/** Post-login landing route. */
export const AUTH_POST_LOGIN_PATH = '/community' as const;

/** Public assets under `apps/client/public`. */
export const AUTH_LOGO_HEADER_SRC = '/logo_small.webp' as const;
export const AUTH_LOGO_FORM_SRC = '/logo_large.webp' as const;

/**
 * Square WebP marks for the web app manifest only.
 * Each `sizes` value in `manifest.ts` must match the file’s intrinsic width×height or Chrome will warn.
 */
export const PWA_MANIFEST_ICON_256_SRC = '/logo_256.webp' as const;
export const PWA_MANIFEST_ICON_1024_SRC = '/logo_1024.webp' as const;

/** HTML `pattern` aligned with `SignupDto` (`@Matches` + `@MinLength(8)`). */
export const SIGNUP_PASSWORD_PATTERN = '(?=.*[A-Z])(?=.*[\\W_]).{8,}' as const;

/** Hero panel background video (replaces static globe artwork). */
export const AUTH_HERO_VIDEO_URL = 'https://cdn.pixabay.com/video/2023/11/14/189046-884476411_tiny.mp4' as const;

/** Brand / CTA cyan from design tokens (`primary-container`). */
export const AUTH_PRIMARY_CONTAINER_HEX = '#00D4FF' as const;

/** Text on primary CTA (`on-primary`). */
export const AUTH_ON_PRIMARY_HEX = '#003642' as const;

/** Page shell background (`surface` / `background` in design HTML). */
export const AUTH_PAGE_BG_HEX = '#0B1229' as const;
