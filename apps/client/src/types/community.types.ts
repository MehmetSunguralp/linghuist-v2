export type DiscoveryUser = {
  id: string;
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  /** When provided by the API, used for client-side age range filtering. */
  age?: number | null;
  languagesKnown: string[];
  languagesLearning: string[];
  isOnline: boolean;
  isTyping?: boolean;
  lastOnline?: string | Date | null;
  country?: string | null;
};

export type UsersResponse = {
  message: string;
  data: {
    users: DiscoveryUser[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type CommunityFilters = {
  known: string;
  learning: string;
  country: string;
  usernameQuery: string;
  ageMin: number;
  ageMax: number;
};

export const DEFAULT_COMMUNITY_AGE_MIN = 18;
export const DEFAULT_COMMUNITY_AGE_MAX = 99;

export function defaultCommunityFilters(): CommunityFilters {
  return {
    known: 'all',
    learning: 'all',
    country: 'all',
    usernameQuery: '',
    ageMin: DEFAULT_COMMUNITY_AGE_MIN,
    ageMax: DEFAULT_COMMUNITY_AGE_MAX,
  };
}
