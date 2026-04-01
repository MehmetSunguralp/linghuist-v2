'use client';

const signedUrlCache = new Map<string, string>();

function isAlreadyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^data:/i.test(value) || /^blob:/i.test(value);
}

export async function resolveSignedStorageUrl(path: string | null | undefined, accessToken: string | null): Promise<string> {
  if (!path) return '';
  if (isAlreadyUrl(path)) return path;
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
