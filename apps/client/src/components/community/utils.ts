import countries from 'i18n-iso-countries';
import countriesEn from 'i18n-iso-countries/langs/en.json';
import ISO6391 from 'iso-639-1';

import type { DiscoveryUser } from '@/types/community.types';

import { ISO639_1_TO_TERRITORY } from '@/lib/iso639-territory';

countries.registerLocale(countriesEn);

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'GB',
  english: 'GB',
  es: 'ES',
  spanish: 'ES',
  fr: 'FR',
  french: 'FR',
  de: 'DE',
  german: 'DE',
  pt: 'PT',
  portuguese: 'PT',
  it: 'IT',
  italian: 'IT',
  ko: 'KR',
  korean: 'KR',
  ja: 'JP',
  japanese: 'JP',
  tr: 'TR',
  turkish: 'TR',
  ar: 'SA',
  arabic: 'SA',
  ru: 'RU',
  russian: 'RU',
  zh: 'CN',
  chinese: 'CN',
  hi: 'IN',
  hindi: 'IN',
  ga: 'IE',
  irish: 'IE',
};

export const languageOptions = ['all', ...ISO6391.getAllNames().sort((a, b) => a.localeCompare(b))];
export const countryOptions = [
  'all',
  ...Object.values(countries.getNames('en', { select: 'official' })).sort((a, b) => a.localeCompare(b)),
];

export function normalizeLanguageLabel(language?: string): string {
  if (!language) return '';
  const raw = language.trim();
  if (raw.length <= 3) {
    const byCode = ISO6391.getName(raw.toLowerCase());
    return byCode || raw;
  }
  return raw;
}

export function codeFromLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  const normalized = language.trim().toLowerCase();
  const mapDirect = LANGUAGE_TO_COUNTRY[normalized];
  if (mapDirect) return mapDirect;

  if (normalized.length === 2) {
    const fromIso = ISO639_1_TO_TERRITORY[normalized];
    if (fromIso) return LANGUAGE_TO_COUNTRY[normalized] ?? fromIso;
  }

  const code = ISO6391.getCode(language);
  if (!code) return undefined;
  const lower = code.toLowerCase();
  return LANGUAGE_TO_COUNTRY[lower] ?? ISO639_1_TO_TERRITORY[lower];
}

export function codeFromCountry(countryName?: string | null): string | undefined {
  if (!countryName) return undefined;
  return countries.getAlpha2Code(countryName, 'en') ?? undefined;
}

function lastOnlineTimestamp(value?: string | Date | null): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export function sortUsersByPresenceAndLastOnline(users: DiscoveryUser[]): DiscoveryUser[] {
  return [...users].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return lastOnlineTimestamp(b.lastOnline) - lastOnlineTimestamp(a.lastOnline);
  });
}
