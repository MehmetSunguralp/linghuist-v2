const sharedProfileFields = {
  username: true,
  name: true,
  avatarUrl: true,
  thumbnailUrl: true,
  languagesKnown: true,
  languagesLearning: true,
  isOnline: true,
  isTyping: true,
  lastOnline: true,
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
  role: true,
  ...sharedDetailFields,
} as const;

export const listUsersSelect = {
  id: true,
  ...sharedProfileFields,
} as const;

export const profileByUsernameSelect = {
  id: true,
  ...sharedDetailFields,
} as const;
