/**
 * Query-string helpers for language filters (comma-separated ISO-style codes).
 */

/** Parses `?known=en,tr` into lowercase codes; returns undefined if empty or missing. */
export function parseCommaSeparatedLanguageCodes(param?: string): string[] | undefined {
  if (param == null || String(param).trim() === '') {
    return undefined;
  }
  const codes = String(param)
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  return codes.length ? codes : undefined;
}

/** Dedupes, trims, lowercases language codes before persisting. */
export function normalizeLanguageCodes(codes: string[]): string[] {
  return [...new Set(codes.map((c) => c.trim().toLowerCase()).filter(Boolean))];
}
