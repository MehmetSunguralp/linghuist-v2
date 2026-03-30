/**
 * Decode JWT payload for client-side display only (not a security boundary).
 */
export function decodeAccessTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const AVATAR_CLAIM_KEYS = ['picture', 'avatarUrl', 'avatar', 'thumbnailUrl', 'image'] as const;

/** Best-effort avatar URL from access token claims (if the issuer embeds one). */
export function avatarUrlFromAccessToken(token: string | null): string | null {
  if (!token) return null;
  const payload = decodeAccessTokenPayload(token);
  if (!payload) return null;
  for (const key of AVATAR_CLAIM_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

/** Two-letter initials for avatar fallback from JWT claims (best-effort). */
export function initialsFromAccessToken(token: string | null): string {
  if (!token) return '?';
  const p = decodeAccessTokenPayload(token);
  if (!p) return '?';
  let name = '';
  if (typeof p.name === 'string') name = p.name;
  else if (typeof p.preferred_username === 'string') name = p.preferred_username;
  else if (typeof p.username === 'string') name = p.username;
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0];
      const b = parts[parts.length - 1][0];
      if (a && b) return `${a}${b}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  const email = typeof p.email === 'string' ? p.email : '';
  const local = email.split('@')[0] ?? '';
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return local.toUpperCase();
  return '?';
}

/**
 * Decode JWT `exp` for client-side session UX (not a security boundary).
 */
export function getAccessTokenExpiryMs(token: string): number | null {
  const data = decodeAccessTokenPayload(token);
  if (!data) return null;
  const exp = data.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

/** True when token is missing `exp`, past expiry, or within `skewMs` of exp. */
export function isAccessTokenExpired(token: string, skewMs = 30_000): boolean {
  const expMs = getAccessTokenExpiryMs(token);
  if (expMs === null) return true;
  return Date.now() >= expMs - skewMs;
}
