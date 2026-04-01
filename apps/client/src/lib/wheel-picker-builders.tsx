'use client';

import ISO6391 from 'iso-639-1';
import CountryFlag from 'react-country-flag';

import type { WheelPickerOption } from '@/components/wheel-picker';
import { codeFromCountry, codeFromLanguage, countryOptions, languageOptions } from '@/components/community/utils';

export function buildNumericAgeOptions(min: number, max: number): WheelPickerOption<number>[] {
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const v = min + i;
    return {
      value: v,
      label: <span className="tabular-nums text-[#dce1ff]">{v}</span>,
      textValue: String(v),
    };
  });
}

/** Profile country: first value is empty sentinel `__empty_country__`. */
export function buildProfileCountryOptions(emptyLabel: string): WheelPickerOption<string>[] {
  const empty: WheelPickerOption<string> = {
    value: '__empty_country__',
    label: <span className="text-sm text-[#9caec8]">{emptyLabel}</span>,
    textValue: emptyLabel,
  };
  const rest = countryOptions
    .filter((entry) => entry !== 'all')
    .map((entry) => {
      const cc = codeFromCountry(entry);
      return {
        value: entry,
        textValue: entry,
        label: (
          <span className="inline-flex max-w-full items-center gap-2 text-[#dce1ff]">
            {cc ? <CountryFlag countryCode={cc} svg style={{ width: '1rem', height: '1rem' }} /> : null}
            <span className="truncate">{entry}</span>
          </span>
        ),
      } satisfies WheelPickerOption<string>;
    });
  return [empty, ...rest];
}

export function buildFilterLanguageOptions(allCaption: string): WheelPickerOption<string>[] {
  return languageOptions.map((item) => {
    const code = codeFromLanguage(item);
    return {
      value: item,
      textValue: item,
      label: (
        <span className="inline-flex max-w-full items-center gap-2 text-[#dce1ff]">
          {item !== 'all' && code ? (
            <CountryFlag countryCode={code} svg style={{ width: '1rem', height: '1rem' }} />
          ) : null}
          <span className="truncate">{item === 'all' ? allCaption : item}</span>
        </span>
      ),
    } satisfies WheelPickerOption<string>;
  });
}

export function buildFilterCountryOptions(allCaption: string): WheelPickerOption<string>[] {
  return countryOptions.map((item) => {
    const code = codeFromCountry(item);
    return {
      value: item,
      textValue: item,
      label: (
        <span className="inline-flex max-w-full items-center gap-2 text-[#dce1ff]">
          {item !== 'all' && code ? (
            <CountryFlag countryCode={code} svg style={{ width: '1rem', height: '1rem' }} />
          ) : null}
          <span className="truncate">{item === 'all' ? allCaption : item}</span>
        </span>
      ),
    } satisfies WheelPickerOption<string>;
  });
}

export function buildModalLanguageCodeOptions(
  selectableLanguageNames: string[],
  chooseLabel: string,
): WheelPickerOption<string>[] {
  const empty: WheelPickerOption<string> = {
    value: '__empty_language__',
    label: <span className="text-sm text-[#9caec8]">{chooseLabel}</span>,
    textValue: chooseLabel,
  };
  const rest = selectableLanguageNames.flatMap((languageName) => {
    const code = ISO6391.getCode(languageName);
    if (!code) return [];
    const territory = codeFromLanguage(code);
    return [
      {
        value: code,
        textValue: languageName,
        label: (
          <span className="inline-flex max-w-full items-center gap-2 text-[#dce1ff]">
            {territory ? <CountryFlag countryCode={territory} svg style={{ width: '1rem', height: '1rem' }} /> : null}
            <span className="truncate">{languageName}</span>
          </span>
        ),
      } satisfies WheelPickerOption<string>,
    ];
  });
  return [empty, ...rest];
}

export function buildModalLevelOptions(levels: string[], chooseLabel: string): WheelPickerOption<string>[] {
  const empty: WheelPickerOption<string> = {
    value: '__empty_level__',
    label: <span className="text-sm text-[#9caec8]">{chooseLabel}</span>,
    textValue: chooseLabel,
  };
  const rest = levels.map(
    (level) =>
      ({
        value: level,
        textValue: level,
        label: <span className="text-[#dce1ff]">{level}</span>,
      }) satisfies WheelPickerOption<string>,
  );
  return [empty, ...rest];
}
