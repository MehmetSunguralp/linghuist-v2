'use client';

import * as React from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { AUTH_SIGN_IN_PATH } from '@/config/auth.constants';
import { isLoginEnvelope, messageFromUnknownError, postConfirmEmail } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';

function getTokenFromSearchOrHash(search: URLSearchParams): { accessToken: string; refreshToken?: string } {
  const fromQueryAccess = search.get('access_token') || search.get('accessToken') || '';
  const fromQueryRefresh = search.get('refresh_token') || search.get('refreshToken') || '';

  if (fromQueryAccess) {
    return { accessToken: fromQueryAccess, refreshToken: fromQueryRefresh || undefined };
  }

  const hash = globalThis.location.hash.replace(/^#/, '');
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token') || hashParams.get('accessToken') || '';
  const refreshToken = hashParams.get('refresh_token') || hashParams.get('refreshToken') || '';
  return { accessToken, refreshToken: refreshToken || undefined };
}

export default function ConfirmEmailPage() {
  return (
    <React.Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-[#0b1229] p-4 text-[#dce1ff]">
          <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111834] p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-[#00d4ff]" />
              <h1 className="text-lg font-semibold">Email confirmation</h1>
            </div>
            <p className="text-sm text-[#9daccc]">Confirming your email...</p>
          </section>
        </main>
      }
    >
      <ConfirmEmailContent />
    </React.Suspense>
  );
}

function ConfirmEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [state, setState] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState('Confirming your email...');

  React.useEffect(() => {
    let mounted = true;

    async function run() {
      const { accessToken, refreshToken } = getTokenFromSearchOrHash(params);
      if (!accessToken) {
        if (!mounted) return;
        setState('error');
        setMessage('Confirmation token is missing or invalid.');
        return;
      }

      const { ok, json } = await postConfirmEmail({
        accessToken,
        refreshToken,
      });

      if (!mounted) return;
      if (ok && isLoginEnvelope(json)) {
        setSession(json.data);
        setState('success');
        setMessage('Email confirmed. Redirecting...');
        router.replace('/onboarding');
        router.refresh();
        return;
      }

      setState('error');
      setMessage(messageFromUnknownError(json) || 'Email confirmation failed.');
    }

    void run();
    return () => {
      mounted = false;
    };
  }, [params, router, setSession]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0b1229] p-4 text-[#dce1ff]">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111834] p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          {state === 'loading' ? (
            <Loader2 className="size-5 animate-spin text-[#00d4ff]" />
          ) : (
            <MailCheck className={`size-5 ${state === 'success' ? 'text-emerald-400' : 'text-amber-400'}`} />
          )}
          <h1 className="text-lg font-semibold">Email confirmation</h1>
        </div>
        <p className="text-sm text-[#9daccc]">{message}</p>

        {state === 'error' ? (
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#00cfff] px-4 py-2.5 text-sm font-semibold text-[#053545]"
            onClick={() => router.replace(AUTH_SIGN_IN_PATH)}
          >
            Go to sign in
          </button>
        ) : null}
      </section>
    </main>
  );
}
