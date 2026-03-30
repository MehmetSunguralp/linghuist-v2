'use client';

import * as React from 'react';
import { Bell, Check, Filter, MessageCircle, Rss, Users, X } from 'lucide-react';
import Link from 'next/link';

import { enStrings } from '@/config/en.strings';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/auth-store';

import { CommunityAgeRangeControl, CommunityFiltersForm } from './filters';
import { CommunityHeaderUserMenu } from './community-header-user-menu';
import type { CommunityFilters, DiscoveryUser, UsersResponse } from '@/types/community.types';
import {
  DEFAULT_COMMUNITY_AGE_MAX,
  DEFAULT_COMMUNITY_AGE_MIN,
  defaultCommunityFilters,
} from '@/types/community.types';
import { CommunityUserCard } from './user-card';
import { codeFromCountry, codeFromLanguage, sortUsersByPresenceAndLastOnline } from './utils';

const strings = enStrings.community;

function communityFiltersEqual(a: CommunityFilters, b: CommunityFilters): boolean {
  return (
    a.known === b.known &&
    a.learning === b.learning &&
    a.country === b.country &&
    a.usernameQuery.trim() === b.usernameQuery.trim() &&
    a.ageMin === b.ageMin &&
    a.ageMax === b.ageMax
  );
}

function hasAnyFilter(filters: CommunityFilters): boolean {
  return (
    filters.known !== 'all' ||
    filters.learning !== 'all' ||
    filters.country !== 'all' ||
    filters.usernameQuery.trim() !== '' ||
    filters.ageMin !== DEFAULT_COMMUNITY_AGE_MIN ||
    filters.ageMax !== DEFAULT_COMMUNITY_AGE_MAX
  );
}

export function CommunityClient() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [filters, setFilters] = React.useState<CommunityFilters>(() => defaultCommunityFilters());
  const [draftFilters, setDraftFilters] = React.useState<CommunityFilters>(() => defaultCommunityFilters());

  const [page, setPage] = React.useState(1);
  const [hasNextPage, setHasNextPage] = React.useState(true);
  const [loadingFirstPage, setLoadingFirstPage] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<DiscoveryUser[]>([]);
  const [isMobileFilterOpen, setMobileFilterOpen] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setUsers([]);
    setPage(1);
    setHasNextPage(true);
  }, [filters, accessToken]);

  React.useEffect(() => {
    let active = true;

    async function loadUsers() {
      if (!accessToken) return;
      if (!hasNextPage && page !== 1) return;

      if (page === 1) setLoadingFirstPage(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        if (filters.known !== 'all') query.set('known', filters.known);
        if (filters.learning !== 'all') query.set('learning', filters.learning);
        const res = await fetch(`/api/user/all/${page}?${query.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });

        const json: unknown = await res.json();
        if (!res.ok) {
          const message =
            typeof json === 'object' && json !== null && 'message' in json
              ? String((json as Record<string, unknown>).message)
              : 'Failed to load users';
          throw new Error(message);
        }

        const envelope = json as UsersResponse;
        if (!active) return;

        const incoming = envelope.data.users ?? [];
        setHasNextPage(Boolean(envelope.data.hasNextPage));
        setUsers((prev) => {
          if (page === 1) return incoming;
          const seen = new Set(prev.map((u) => u.id));
          const merged = [...prev];
          for (const user of incoming) {
            if (!seen.has(user.id)) merged.push(user);
          }
          return merged;
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        if (!active) return;
        setLoadingFirstPage(false);
        setLoadingMore(false);
      }
    }

    void loadUsers();
    return () => {
      active = false;
    };
  }, [accessToken, filters.known, filters.learning, page, hasNextPage]);

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || loadingFirstPage || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, loadingFirstPage, loadingMore, users.length]);

  const visibleUsers = React.useMemo(() => {
    const sorted = sortUsersByPresenceAndLastOnline(users);
    let list = sorted;

    if (filters.country !== 'all') {
      const selectedCountryCode = codeFromCountry(filters.country);
      if (selectedCountryCode) {
        list = list.filter((user) => {
          const direct = codeFromCountry(user.country);
          if (direct) return direct === selectedCountryCode;
          return codeFromLanguage(user.languagesKnown[0]) === selectedCountryCode;
        });
      }
    }

    const q = filters.usernameQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((user) => {
        const u = user.username?.toLowerCase() ?? '';
        const n = user.name?.toLowerCase() ?? '';
        return u.includes(q) || n.includes(q);
      });
    }

    const ageFilterActive =
      filters.ageMin !== DEFAULT_COMMUNITY_AGE_MIN || filters.ageMax !== DEFAULT_COMMUNITY_AGE_MAX;
    if (ageFilterActive) {
      list = list.filter(
        (user) => user.age != null && user.age >= filters.ageMin && user.age <= filters.ageMax,
      );
    }

    return list;
  }, [users, filters.country, filters.usernameQuery, filters.ageMin, filters.ageMax]);

  const draftDiffersFromApplied = !communityFiltersEqual(draftFilters, filters);
  /** Only clear applied filters; ignore draft-only edits so Reset stays off until something is applied. */
  const canReset = hasAnyFilter(filters);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0b1229] text-[#dce1ff]">
      <header className="hidden border-b border-white/5 bg-[#0b1229]/90 backdrop-blur md:block">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-[#00d4ff]">
            <Users className="h-5 w-5" />
            <span className="text-xl font-bold">{enStrings.app.brandName}</span>
          </div>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/community" className="inline-flex items-center gap-1 text-[#00d4ff]">
              <Users className="h-4 w-4" />
              {strings.navCommunity}
            </Link>
            <button type="button" className="inline-flex items-center gap-1 text-[#8ea0ba] transition-colors hover:text-white">
              <Rss className="h-4 w-4" />
              {strings.navFeed}
            </button>
            <button type="button" className="inline-flex items-center gap-1 text-[#8ea0ba] transition-colors hover:text-white">
              <MessageCircle className="h-4 w-4" />
              {strings.navChats}
            </button>
            <button type="button" className="inline-flex items-center gap-1 text-[#8ea0ba] transition-colors hover:text-white">
              <Bell className="h-4 w-4" />
              {strings.navNotifications}
            </button>
            <CommunityHeaderUserMenu />
          </nav>
        </div>
      </header>

      <div className="flex h-14 items-center justify-end border-b border-white/5 px-4 md:hidden">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-[#181e36] px-3 py-2 text-xs font-semibold"
          onClick={() => {
            setDraftFilters(filters);
            setMobileFilterOpen(true);
          }}
        >
          <Filter className="h-4 w-4" />
          {strings.filterButton}
        </button>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 pt-5 md:px-6 md:pt-6">
        <section className="mb-4 shrink-0">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{strings.discoverTitle}</h1>
          <p className="mt-2 text-sm text-[#9caec8]">{strings.discoverSubtitle}</p>
        </section>

        <section className="mb-3 hidden shrink-0 rounded-xl border border-white/5 bg-[#0b1229]/95 p-3 backdrop-blur md:block">
          <CommunityFiltersForm filters={draftFilters} onFiltersChange={setDraftFilters} />
          <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-3">
            <CommunityAgeRangeControl className="flex-1" filters={draftFilters} onFiltersChange={setDraftFilters} />
            <button
              type="button"
              disabled={!canReset}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-[#dce1ff] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45 sm:h-12 sm:px-6"
              onClick={() => {
                const cleared = defaultCommunityFilters();
                setDraftFilters(cleared);
                setFilters(cleared);
              }}
            >
              {strings.resetFilters}
            </button>
            <button
              type="button"
              disabled={!draftDiffersFromApplied}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#00d4ff] px-7 py-3 text-sm font-semibold text-[#003642] disabled:cursor-not-allowed disabled:opacity-45 sm:h-12 sm:px-8"
              onClick={() => setFilters(draftFilters)}
            >
              <Check className="h-5 w-5 shrink-0" aria-hidden />
              {strings.filterApply}
            </button>
          </div>
        </section>

        {error ? <p className="mb-3 shrink-0 rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

        <section className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {loadingFirstPage ? (
            <div className="flex items-center gap-2 py-6 text-sm text-[#9caec8]">
              <Spinner className="h-5 w-5" />
              <span>{strings.loadingUsers}</span>
            </div>
          ) : null}

          {!loadingFirstPage && visibleUsers.length === 0 ? (
            <p className="py-6 text-sm text-[#9caec8]">{strings.noUsers}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleUsers.map((user) => (
              <CommunityUserCard key={user.id} user={user} />
            ))}
          </div>

          <div ref={sentinelRef} className="h-8 w-full" />

          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 pb-4 text-sm text-[#9caec8]">
              <Spinner className="h-5 w-5" />
              <span>{strings.loadingMoreUsers}</span>
            </div>
          ) : null}
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-white/10 bg-[#0b1229]/95 px-2 py-2 backdrop-blur md:hidden">
        <Link href="/community" className="flex flex-col items-center gap-1 text-[#00d4ff]">
          <Users className="h-4 w-4" />
          <span className="text-[11px] font-semibold">{strings.navCommunity}</span>
        </Link>
        <button type="button" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <Rss className="h-4 w-4" />
          <span className="text-[11px]">{strings.navFeed}</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <MessageCircle className="h-4 w-4" />
          <span className="text-[11px]">{strings.navChats}</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <Bell className="h-4 w-4" />
          <span className="text-[11px]">{strings.navNotifications}</span>
        </button>
        <Link href="/profile/me" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <img src="/logo_small.webp" alt={strings.navProfile} className="h-6 w-6 rounded-full object-cover" />
          <span className="text-[11px]">{strings.navProfile}</span>
        </Link>
      </nav>

      {isMobileFilterOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 md:hidden">
          <div className="mx-auto mt-14 max-h-[calc(100dvh-5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#141a32] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">{strings.filterModalTitle}</h2>
              <button type="button" className="rounded-full p-1 text-[#9caec8]" onClick={() => setMobileFilterOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <CommunityFiltersForm filters={draftFilters} onFiltersChange={setDraftFilters} />

            <div className="mt-4 flex flex-col items-stretch gap-3">
              <CommunityAgeRangeControl className="w-full" filters={draftFilters} onFiltersChange={setDraftFilters} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  disabled={!canReset}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-[#dce1ff] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45 sm:h-12 sm:px-6"
                  onClick={() => {
                    const cleared = defaultCommunityFilters();
                    setDraftFilters(cleared);
                    setFilters(cleared);
                  }}
                >
                  {strings.resetFilters}
                </button>
                <button
                  type="button"
                  disabled={!draftDiffersFromApplied}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#00d4ff] px-7 py-3 text-sm font-semibold text-[#003642] disabled:cursor-not-allowed disabled:opacity-45 sm:h-12"
                  onClick={() => {
                    setFilters(draftFilters);
                    setMobileFilterOpen(false);
                  }}
                >
                  <Check className="h-5 w-5 shrink-0" aria-hidden />
                  {strings.filterApply}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="w-full rounded-md bg-[#222941] px-3 py-2 text-sm font-medium"
                onClick={() => setMobileFilterOpen(false)}
              >
                {strings.filterCancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
