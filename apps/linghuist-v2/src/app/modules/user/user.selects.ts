const sharedProfileFields = {
  username: true,
  name: true,
  avatarUrl: true,
  thumbnailUrl: true,
  languagesKnown: true,
  languagesLearning: true,
} as const;

const sharedDetailFields = {
  ...sharedProfileFields,
  country: true,
  age: true,
  isVerified: true,
  bio: true,
} as const;

export const meUserSelect = {
  id: true,
  email: true,
  ...sharedDetailFields,
} as const;

export const listUsersSelect = {
  id: true,
  ...sharedProfileFields,
  isOnline: true,
  lastOnline: true,
} as const;

export const profileByUsernameSelect = {
  ...sharedDetailFields,
} as const;
