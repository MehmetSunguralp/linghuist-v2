import type { ApiEnvelope, LoginSessionData } from '@/types/auth.types';

type AuthApiPath = 'login' | 'signup';

export async function postAuthAction(
  path: AuthApiPath,
  body: Record<string, string>,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function messageFromUnknownError(json: unknown): string {
  if (typeof json !== 'object' || json === null) {
    return 'Request failed';
  }
  const rec = json as Record<string, unknown>;
  const msg = rec.message;
  if (Array.isArray(msg)) {
    return msg.map(String).join('. ');
  }
  if (typeof msg === 'string') {
    return msg;
  }
  return 'Request failed';
}

export async function postRequestPasswordReset(body: {
  email: string;
}): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch('/api/auth/request-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function isLoginEnvelope(json: unknown): json is ApiEnvelope<LoginSessionData> {
  if (typeof json !== 'object' || json === null) return false;
  const rec = json as Record<string, unknown>;
  const data = rec.data;
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.access_token === 'string' && typeof d.refresh_token === 'string';
}
