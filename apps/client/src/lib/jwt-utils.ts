/**
 * Decode JWT `exp` for client-side session UX (not a security boundary).
 */
export function getAccessTokenExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json) as { exp?: unknown };
    return typeof data.exp === 'number' ? data.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when token is missing `exp`, past expiry, or within `skewMs` of exp. */
export function isAccessTokenExpired(token: string, skewMs = 30_000): boolean {
  const expMs = getAccessTokenExpiryMs(token);
  if (expMs === null) return true;
  return Date.now() >= expMs - skewMs;
}
