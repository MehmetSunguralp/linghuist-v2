/**
 * Routes that never require a logged-in session (pathname from `usePathname()`).
 * Add new public segments here; wrap any other app route with `AuthUserGate` (see `community/layout.tsx`).
 * For server-enforced auth (no flash), use httpOnly cookies + `middleware.ts` — incompatible with today’s localStorage tokens.
 */
export function pathIsPublic(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  if (pathname.startsWith('/auth')) return true;
  return false;
}

export function pathRequiresAuth(pathname: string): boolean {
  return !pathIsPublic(pathname);
}
