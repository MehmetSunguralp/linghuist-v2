/**
 * Client auth shapes aligned with backend DTOs (`LoginDto`, `SignupDto`) and
 * `User` in `libs/prisma/schema.prisma` (email is the primary identifier on User).
 */
export type LoginFormValues = {
  email: string;
  password: string;
};

export type SignUpFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthTabValue = 'login' | 'signup';

/** Mirrors `ApiEnvelope` / `LoginSessionData` from Nest `api-envelope.types`. */
export type ApiEnvelope<T> = {
  message: string;
  data: T;
};

export type LoginSessionData = {
  access_token: string;
  refresh_token: string;
};
