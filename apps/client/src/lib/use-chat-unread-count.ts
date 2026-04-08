'use client';

import * as React from 'react';

import { useAuthStore } from '@/stores/auth-store';
import type { ChatListEnvelope } from '@/types/chat.types';

const REFRESH_MS = 30_000;

export function useChatUnreadCount(): number {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [count, setCount] = React.useState(0);

  const load = React.useCallback(async () => {
    if (!accessToken) {
      setCount(0);
      return;
    }
    try {
      const res = await fetch('/api/user/chats/list', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = (await res.json()) as ChatListEnvelope;
      const total = (json.data?.chats ?? []).reduce((sum, c) => sum + (c.unreadIncomingCount || 0), 0);
      setCount(total);
    } catch {
      // Silent failure; badge will update on next poll.
    }
  }, [accessToken]);

  React.useEffect(() => {
    void load();
    if (!accessToken) return;
    const id = globalThis.setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => globalThis.clearInterval(id);
  }, [accessToken, load]);

  React.useEffect(() => {
    if (!accessToken) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [accessToken, load]);

  return count;
}
