'use client';

const signedUrlCache = new Map<string, string>();

function isDirectImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^data:/i.test(value) || /^blob:/i.test(value);
}

/**
 * After calling {@link resolveSignedStorageUrl}, use this for `<img src>`.
 * Bucket-relative paths (e.g. `profilePictures/uuid/file.webp`) must never be used as a
 * browser URL: they resolve relative to the current route and 404 (e.g. `/profile/profilePictures/...`).
 */
export function imageSrcAfterSigning(signed: string, rawPath: string): string {
  if (signed) return signed;
  if (rawPath && isDirectImageUrl(rawPath)) return rawPath;
  return '';
}

export async function resolveSignedStorageUrl(path: string | null | undefined, accessToken: string | null): Promise<string> {
  if (!path) return '';
  if (isDirectImageUrl(path)) return path;
  if (!accessToken) return '';
  const cached = signedUrlCache.get(path);
  if (cached) return cached;

  const queryPath = encodeURIComponent(path);
  const res = await fetch(`/api/storage/sign?path=${queryPath}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { signedUrl?: string } };
  const signedUrl = json?.data?.signedUrl ?? '';
  if (signedUrl) {
    signedUrlCache.set(path, signedUrl);
    return signedUrl;
  }
  return '';
}
