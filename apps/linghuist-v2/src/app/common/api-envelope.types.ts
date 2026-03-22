/**
 * Standard success payload for HTTP JSON responses across the API.
 * Errors are still thrown as Nest HTTP exceptions (no envelope).
 */
export type ApiEnvelope<T> = {
  message: string;
  data: T;
};

/** Auth login tokens returned from Supabase session. */
export type LoginSessionData = {
  access_token: string;
  refresh_token: string;
};
