'use client';

import * as React from 'react';
import CountryFlag from 'react-country-flag';
import { Search } from 'lucide-react';

import { enStrings } from '@/config/en.strings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import type { CommunityFilters } from '@/types/community.types';
import { DEFAULT_COMMUNITY_AGE_MAX, DEFAULT_COMMUNITY_AGE_MIN } from '@/types/community.types';
import { cn } from '@/lib/utils';
import { codeFromCountry, codeFromLanguage, countryOptions, languageOptions } from './utils';

type CommunityFiltersProps = {
  readonly filters: CommunityFilters;
  readonly onFiltersChange: (filters: CommunityFilters) => void;
};

type CommunityAgeRangeProps = {
  readonly filters: CommunityFilters;
  readonly onFiltersChange: (filters: CommunityFilters) => void;
  readonly className?: string;
};

const strings = enStrings.community;

function sortRangePair(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

export function CommunityAgeRangeControl({ filters, onFiltersChange, className }: CommunityAgeRangeProps) {
  /** Local range while dragging: avoids lifting state on every pointermove (parent + list stay idle). */
  const [localRange, setLocalRange] = React.useState<[number, number]>(() => [
    filters.ageMin,
    filters.ageMax,
  ]);

  React.useEffect(() => {
    setLocalRange([filters.ageMin, filters.ageMax]);
  }, [filters.ageMin, filters.ageMax]);

  const [lo, hi] = localRange;

  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#9caec8]">
        <span>{strings.labelAgeRange}</span>
        <span className="tabular-nums text-[#dce1ff]">
          {lo}–{hi}
        </span>
      </div>
      <Slider
        min={DEFAULT_COMMUNITY_AGE_MIN}
        max={DEFAULT_COMMUNITY_AGE_MAX}
        step={1}
        value={localRange}
        onValueChange={(next) => {
          const [a, b] = next;
          setLocalRange(sortRangePair(a, b));
        }}
        onValueCommit={(next) => {
          const [a, b] = next;
          const [min, max] = sortRangePair(a, b);
          onFiltersChange({
            ...filters,
            ageMin: min,
            ageMax: max,
          });
        }}
        className="w-full"
      />
    </div>
  );
}

export function CommunityFiltersForm({ filters, onFiltersChange }: CommunityFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <Select value={filters.known} onValueChange={(value) => onFiltersChange({ ...filters, known: value })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={strings.placeholderKnown} />
        </SelectTrigger>
        <SelectContent>
          {languageOptions.map((item) => {
            const code = codeFromLanguage(item);
            return (
              <SelectItem key={`known-${item}`} value={item}>
                <span className="inline-flex items-center gap-2">
                  {item !== 'all' && code ? (
                    <CountryFlag countryCode={code} svg style={{ width: '1.1em', height: '1.1em' }} />
                  ) : null}
                  <span>{item === 'all' ? strings.filterKnownAll : item}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={filters.learning} onValueChange={(value) => onFiltersChange({ ...filters, learning: value })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={strings.placeholderLearning} />
        </SelectTrigger>
        <SelectContent>
          {languageOptions.map((item) => {
            const code = codeFromLanguage(item);
            return (
              <SelectItem key={`learning-${item}`} value={item}>
                <span className="inline-flex items-center gap-2">
                  {item !== 'all' && code ? (
                    <CountryFlag countryCode={code} svg style={{ width: '1.1em', height: '1.1em' }} />
                  ) : null}
                  <span>{item === 'all' ? strings.filterLearningAll : item}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={filters.country} onValueChange={(value) => onFiltersChange({ ...filters, country: value })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={strings.placeholderCountry} />
        </SelectTrigger>
        <SelectContent>
          {countryOptions.map((item) => {
            const code = codeFromCountry(item);
            return (
              <SelectItem key={`country-${item}`} value={item}>
                <span className="inline-flex items-center gap-2">
                  {item !== 'all' && code ? (
                    <CountryFlag countryCode={code} svg style={{ width: '1.1em', height: '1.1em' }} />
                  ) : null}
                  <span>{item === 'all' ? strings.filterCountryAll : item}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <div className="relative w-full lg:min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7a94]"
          aria-hidden
        />
        <label className="sr-only" htmlFor="community-username-search">
          {strings.placeholderUsernameSearch}
        </label>
        <input
          id="community-username-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={strings.placeholderUsernameSearch}
          value={filters.usernameQuery}
          onChange={(e) => onFiltersChange({ ...filters, usernameQuery: e.target.value })}
          className="h-10 w-full rounded-md border border-white/10 bg-[#141a32] py-2 pl-10 pr-3 text-base text-[#dce1ff] placeholder:text-[#6b7a94] focus:border-[#00d4ff]/50 focus:outline-none focus:ring-1 focus:ring-[#00d4ff]/40 md:text-sm"
        />
      </div>
    </div>
  );
}
