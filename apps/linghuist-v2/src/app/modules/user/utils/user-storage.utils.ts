export function getStoragePathFromUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  if (!url.startsWith(`${bucket}/`)) return null;
  return url.slice(bucket.length + 1) || null;
}
