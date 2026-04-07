'use client';

import * as React from 'react';
import {
  Check,
  CheckCheck,
  Ban,
  Clock3,
  Languages,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Search,
  SendHorizontal,
  Trash2,
} from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import CountryFlag from 'react-country-flag';

import { codeFromCountry } from '@/components/community/utils';
import { imageSrcAfterSigning, resolveSignedStorageUrl } from '@/lib/storage-url';
import { useAuthStore } from '@/stores/auth-store';
import type {
  ChatListEnvelope,
  ChatListItem,
  ChatMessage,
  ChatMessagesEnvelope,
  ChatReadPayload,
  ChatTypingPayload,
} from '@/types/chat.types';

const USER_SOCKET_EVENTS = {
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_TYPING: 'chat:typing',
  CHAT_MESSAGE: 'chat:message',
  CHAT_READ: 'chat:read',
  CHAT_INBOX_UPDATED: 'chat:inbox:updated',
  CHAT_MESSAGE_UPDATED: 'chat:message:updated',
  PRESENCE_UPDATED: 'presence:updated',
} as const;

type MeEnvelope = {
  data?: { id?: string; languagesKnown?: string[]; languagesLearning?: string[] };
};

type SuggestionEnvelope = {
  message?: string;
  data?: { suggestion?: string; translatedSuggestion?: string };
};

type PresencePayload = {
  userId: string;
  isOnline: boolean;
  isTyping: boolean;
};
type MenuAction = 'correct' | 'edit';
type ChatMessageView = ChatMessage & { __pending?: boolean; __aiSuggested?: boolean; __clientKey?: string };

function formatMessageTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatClient() {
  const router = useRouter();
  const params = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [myUserId, setMyUserId] = React.useState<string>('');
  const [loadingChats, setLoadingChats] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [chats, setChats] = React.useState<ChatListItem[]>([]);
  const [messages, setMessages] = React.useState<ChatMessageView[]>([]);
  const [selectedChatId, setSelectedChatId] = React.useState<string>('');
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [typingByUserId, setTypingByUserId] = React.useState<Record<string, string>>({});
  const [presenceByUserId, setPresenceByUserId] = React.useState<Record<string, boolean>>({});
  const [nativeLanguage, setNativeLanguage] = React.useState('en');
  const [suggestion, setSuggestion] = React.useState<{ suggestion: string; translatedSuggestion: string } | null>(null);
  const [suggesting, setSuggesting] = React.useState(false);
  const [chatQuery, setChatQuery] = React.useState('');
  const [avatarMap, setAvatarMap] = React.useState<Record<string, string>>({});
  const [openBubbleMenuId, setOpenBubbleMenuId] = React.useState('');
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const [editModal, setEditModal] = React.useState<{ messageId: string; value: string } | null>(null);
  const [correctModal, setCorrectModal] = React.useState<{ messageId: string; value: string } | null>(null);
  const [hiddenChatIds, setHiddenChatIds] = React.useState<string[]>([]);

  const socketRef = React.useRef<Socket | null>(null);
  /** Always matches `selectedChatId` during render — avoids missing socket events before `useEffect` runs. */
  const selectedChatIdRef = React.useRef('');
  selectedChatIdRef.current = selectedChatId;
  const typingTimeoutRef = React.useRef<number | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const footerRef = React.useRef<HTMLElement | null>(null);
  const lastSuggestionSendRef = React.useRef<{ chatId: string; content: string; translatedSuggestion: string } | null>(null);

  const selectedChat = React.useMemo(
    () => chats.find((item) => item.chatId === selectedChatId) ?? null,
    [chats, selectedChatId],
  );
  const filteredChats = React.useMemo(() => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => {
      const name = (chat.interlocutorName || '').toLowerCase();
      const user = (chat.interlocutorUsername || '').toLowerCase();
      const preview = (chat.lastMessagePreview || '').toLowerCase();
      return name.includes(q) || user.includes(q) || preview.includes(q);
    });
  }, [chatQuery, chats]);
  const selectedChatAvatar = selectedChat?.interlocutorId ? avatarMap[selectedChat.interlocutorId] || '' : '';
  const selectedChatCountry = codeFromCountry(selectedChat?.interlocutorCountry || '');

  const loadChats = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!accessToken) return;
    const silent = options?.silent === true;
    if (!silent) setLoadingChats(true);
    try {
      const res = await fetch('/api/user/chats/list', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const json = (await res.json()) as ChatListEnvelope;
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load chats');
      }
      const nextChats = json?.data?.chats ?? [];
      const visibleChats = nextChats.filter((chat) => !hiddenChatIds.includes(chat.chatId));
      setChats(visibleChats);
      setSelectedChatId((prev) => {
        if (prev && visibleChats.some((c) => c.chatId === prev)) return prev;
        return visibleChats[0]?.chatId ?? '';
      });
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Failed to load chats');
      }
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }, [accessToken, hiddenChatIds]);

  const loadMessages = React.useCallback(
    async (chatId: string, options?: { silent?: boolean }) => {
      if (!accessToken || !chatId) return;
      const silent = options?.silent === true;
      if (!silent) setLoadingMessages(true);
      try {
        const res = await fetch(`/api/user/chats/${encodeURIComponent(chatId)}/messages`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const json = (await res.json()) as ChatMessagesEnvelope;
        if (!res.ok) {
          throw new Error(json?.message || 'Failed to load messages');
        }
        const mapped = ((json?.data?.messages ?? []) as ChatMessageView[]).map((msg) => ({
          ...msg,
          __aiSuggested: msg.senderId === myUserId && !msg.editedContent && Boolean(msg.translatedText || msg.aiSuggestion),
        }));
        setMessages(mapped);
        socketRef.current?.emit(USER_SOCKET_EVENTS.CHAT_READ, { chatId });
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : 'Failed to load messages');
        }
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [accessToken],
  );

  const loadChatsRef = React.useRef(loadChats);
  loadChatsRef.current = loadChats;
  const loadMessagesRef = React.useRef(loadMessages);
  loadMessagesRef.current = loadMessages;

  React.useEffect(() => {
    if (!accessToken) return;
    void loadChats();
    void (async () => {
      const res = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const me = (await res.json()) as MeEnvelope;
      if (me?.data?.id) setMyUserId(me.data.id);
      const lang = me?.data?.languagesKnown?.[0] || 'en';
      setNativeLanguage(lang);
    })();
  }, [accessToken, loadChats]);

  React.useEffect(() => {
    try {
      const raw = globalThis.localStorage.getItem('chat-hidden-ids');
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setHiddenChatIds(parsed);
    } catch {
      // ignore malformed local storage
    }
  }, []);

  React.useEffect(() => {
    globalThis.localStorage.setItem('chat-hidden-ids', JSON.stringify(hiddenChatIds));
  }, [hiddenChatIds]);

  React.useEffect(() => {
    const queryChatId = params.get('chatId') ?? '';
    if (!queryChatId) return;
    if (selectedChatId === queryChatId) return;
    setSelectedChatId(queryChatId);
  }, [params, selectedChatId]);

  React.useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedChatId);
  }, [selectedChatId, loadMessages]);

  React.useEffect(() => {
    let active = true;
    async function resolveAvatars() {
      if (!accessToken || chats.length === 0) return;
      const pairs = await Promise.all(
        chats.map(async (chat) => {
          const id = chat.interlocutorId || '';
          const raw = chat.interlocutorAvatarUrl || '';
          if (!id || !raw) return [id, ''] as const;
          const signed = await resolveSignedStorageUrl(raw, accessToken);
          return [id, imageSrcAfterSigning(signed, raw)] as const;
        }),
      );
      if (!active) return;
      setAvatarMap((prev) => {
        const next = { ...prev };
        for (const [id, url] of pairs) {
          if (id && url) next[id] = url;
        }
        return next;
      });
    }
    void resolveAvatars();
    return () => {
      active = false;
    };
  }, [accessToken, chats]);

  React.useEffect(() => {
    if (!accessToken) return;
    const fallbackBase = globalThis.location.origin.includes(':8080')
      ? globalThis.location.origin.replace(':8080', ':3000')
      : globalThis.location.origin;
    const base = (process.env.NEXT_PUBLIC_SERVER_URL?.trim() || fallbackBase).replace(/\/$/, '');
    const socket = io(`${base}/api/user`, {
      transports: ['websocket'],
      auth: { token: accessToken },
      extraHeaders: { Authorization: `Bearer ${accessToken}` },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const cid = selectedChatIdRef.current;
      if (!cid) return;
      socket.emit(USER_SOCKET_EVENTS.CHAT_JOIN, { chatId: cid });
      socket.emit(USER_SOCKET_EVENTS.CHAT_READ, { chatId: cid });
    });

    socket.on(USER_SOCKET_EVENTS.CHAT_MESSAGE, (incoming: ChatMessage) => {
      if (!incoming?.chatId) return;
      const openChatId = selectedChatIdRef.current;
      if (incoming.chatId === openChatId) {
        const suggestionHint = lastSuggestionSendRef.current;
        const shouldAttachSuggestedTranslation =
          Boolean(suggestionHint) &&
          incoming.senderId === myUserId &&
          suggestionHint?.chatId === incoming.chatId &&
          incoming.content?.trim() === suggestionHint?.content &&
          !incoming.translatedText;
        setMessages((prev) => {
          const pendingIdx = prev.findIndex(
            (m) => m.__pending && m.senderId === incoming.senderId && m.chatId === incoming.chatId && (m.content || '').trim() === (incoming.content || '').trim(),
          );
          const nextIncoming = shouldAttachSuggestedTranslation
            ? { ...incoming, translatedText: suggestionHint?.translatedSuggestion || incoming.translatedText, __aiSuggested: true }
            : incoming;
          if (pendingIdx >= 0) {
            const next = [...prev];
            next[pendingIdx] = { ...prev[pendingIdx], ...nextIncoming, __pending: false };
            return next;
          }
          const idx = prev.findIndex((m) => m.id === incoming.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...prev[idx], ...nextIncoming };
            return next;
          }
          return [...prev, nextIncoming];
        });
        if (shouldAttachSuggestedTranslation) {
          lastSuggestionSendRef.current = null;
        }
        socket.emit(USER_SOCKET_EVENTS.CHAT_READ, { chatId: incoming.chatId });
      }
      void loadChatsRef.current({ silent: true });
    });

    socket.on(USER_SOCKET_EVENTS.CHAT_MESSAGE_UPDATED, (incoming: ChatMessage) => {
      if (!incoming?.id) return;
      if (incoming.chatId && incoming.chatId !== selectedChatIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === incoming.id
            ? {
                ...m,
                ...incoming,
                __aiSuggested: incoming.senderId === myUserId && !incoming.editedContent && Boolean(incoming.translatedText || incoming.aiSuggestion),
              }
            : m,
        ),
      );
      void loadChatsRef.current({ silent: true });
    });

    socket.on(USER_SOCKET_EVENTS.CHAT_TYPING, (payload: ChatTypingPayload) => {
      if (!payload?.chatId || payload.chatId !== selectedChatIdRef.current) return;
      setTypingByUserId((prev) => {
        const next = { ...prev };
        if (payload.isTyping) next[payload.userId] = payload.chatId;
        else delete next[payload.userId];
        return next;
      });
    });

    socket.on(USER_SOCKET_EVENTS.CHAT_READ, (payload: ChatReadPayload) => {
      if (!payload?.chatId || payload.chatId !== selectedChatIdRef.current || payload.messageIds.length === 0) return;
      setMessages((prev) => prev.map((m) => (payload.messageIds.includes(m.id) ? { ...m, read: true } : m)));
    });

    socket.on(USER_SOCKET_EVENTS.CHAT_INBOX_UPDATED, (payload: { chatId?: string }) => {
      void loadChatsRef.current({ silent: true });
      const cid = payload?.chatId;
      if (cid && cid === selectedChatIdRef.current) {
        void loadMessagesRef.current(cid, { silent: true });
      }
    });

    socket.on(USER_SOCKET_EVENTS.PRESENCE_UPDATED, (payload: PresencePayload) => {
      if (!payload?.userId) return;
      setPresenceByUserId((prev) => ({ ...prev, [payload.userId]: Boolean(payload.isOnline) }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  React.useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedChatId) return;

    socket.emit(USER_SOCKET_EVENTS.CHAT_JOIN, { chatId: selectedChatId });
    socket.emit(USER_SOCKET_EVENTS.CHAT_READ, { chatId: selectedChatId });
    return () => {
      socket.emit(USER_SOCKET_EVENTS.CHAT_LEAVE, { chatId: selectedChatId });
    };
  }, [selectedChatId]);

  const remoteTyping = React.useMemo(() => {
    return Object.keys(typingByUserId).some((userId) => userId !== myUserId && typingByUserId[userId] === selectedChatId);
  }, [typingByUserId, myUserId, selectedChatId]);
  const interlocutorOnline = selectedChat?.interlocutorId ? Boolean(presenceByUserId[selectedChat.interlocutorId]) : false;
  React.useEffect(() => {
    if (!messagesContainerRef.current || !selectedChatId) return;
    const el = messagesContainerRef.current;
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedChatId, suggestion]);

  React.useEffect(() => {
    if (!openBubbleMenuId) return;
    const menuEl = document.querySelector(`[data-bubble-menu-id="${openBubbleMenuId}"]`) as HTMLElement | null;
    const listEl = messagesContainerRef.current;
    const footerEl = footerRef.current;
    if (!menuEl || !listEl || !footerEl) return;
    const menuRect = menuEl.getBoundingClientRect();
    const footerRect = footerEl.getBoundingClientRect();
    if (menuRect.bottom > footerRect.top - 8) {
      listEl.scrollBy({ top: menuRect.bottom - footerRect.top + 20, behavior: 'smooth' });
    }
  }, [openBubbleMenuId]);

  async function sendContent(content: string) {
    if (!content || !selectedChatId || !socketRef.current || sending) return;
    const suggestionHint = lastSuggestionSendRef.current;
    const includeSuggestionTranslation =
      Boolean(suggestionHint) &&
      suggestionHint?.chatId === selectedChatId &&
      suggestionHint?.content.trim() === content.trim();
    const clientKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: ChatMessageView = {
      id: `temp-${clientKey}`,
      chatId: selectedChatId,
      senderId: myUserId || '__me__',
      content,
      correctedText: null,
      translatedText: includeSuggestionTranslation ? suggestionHint?.translatedSuggestion || null : null,
      aiSuggestion: null,
      createdAt: new Date().toISOString(),
      read: false,
      __pending: true,
      __aiSuggested: includeSuggestionTranslation,
      __clientKey: clientKey,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setSending(true);
    try {
      socketRef.current.emit(USER_SOCKET_EVENTS.CHAT_MESSAGE, { chatId: selectedChatId, content });
      setDraft('');
      setSuggestion(null);
      socketRef.current.emit(USER_SOCKET_EVENTS.CHAT_TYPING, { chatId: selectedChatId, isTyping: false });
      if (includeSuggestionTranslation) {
        lastSuggestionSendRef.current = null;
      }
    } finally {
      setSending(false);
    }
  }

  async function onSendMessage() {
    await sendContent(draft.trim());
  }

  async function onGetSuggestion() {
    if (!accessToken || !selectedChatId || suggesting) return;
    setSuggesting(true);
    try {
      const res = await fetch(`/api/user/chats/${encodeURIComponent(selectedChatId)}/suggestion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userLanguage: nativeLanguage.trim() || 'en',
        }),
      });
      const json = (await res.json()) as SuggestionEnvelope;
      if (!res.ok || !json?.data?.suggestion) {
        throw new Error(json?.message || 'Failed to generate suggestion');
      }
      setSuggestion({
        suggestion: json.data.suggestion || '',
        translatedSuggestion: json.data.translatedSuggestion || '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate suggestion');
    } finally {
      setSuggesting(false);
    }
  }

  async function onTranslateMessage(messageId: string) {
    if (!accessToken) return;
    const res = await fetch(`/api/user/chats/messages/${encodeURIComponent(messageId)}/translate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetLanguage: nativeLanguage.trim() || 'en',
      }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(json?.message || 'Translation failed');
      return;
    }
    await loadMessages(selectedChatId);
  }

  async function onCorrectMessage(messageId: string, correctedText: string) {
    if (!accessToken) return;
    if (!correctedText.trim()) return;
    const res = await fetch(`/api/user/chats/messages/${encodeURIComponent(messageId)}/correct`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ correctedText: correctedText.trim() }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(json?.message || 'Correction failed');
      return;
    }
    await loadMessages(selectedChatId);
  }

  async function onEditMessage(messageId: string, content: string) {
    if (!accessToken) return;
    if (!content.trim()) return;
    const res = await fetch(`/api/user/chats/messages/${encodeURIComponent(messageId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: content.trim() }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(json?.message || 'Edit failed');
      return;
    }
    await loadMessages(selectedChatId);
  }

  function onType(nextValue: string) {
    setDraft(nextValue);
    if (lastSuggestionSendRef.current) {
      const original = lastSuggestionSendRef.current.content.trim();
      if (nextValue.trim() !== original) {
        lastSuggestionSendRef.current = null;
      }
    }
    if (!selectedChatId || !socketRef.current) return;
    socketRef.current.emit(USER_SOCKET_EVENTS.CHAT_TYPING, { chatId: selectedChatId, isTyping: true });
    if (typingTimeoutRef.current) {
      globalThis.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = globalThis.setTimeout(() => {
      socketRef.current?.emit(USER_SOCKET_EVENTS.CHAT_TYPING, { chatId: selectedChatId, isTyping: false });
    }, 1000);
  }

  function openActionModal(action: MenuAction, message: ChatMessage) {
    setOpenBubbleMenuId('');
    if (action === 'edit') {
      setEditModal({ messageId: message.id, value: message.content || '' });
      return;
    }
    setCorrectModal({ messageId: message.id, value: message.content || '' });
  }

  async function submitEditModal() {
    if (!editModal) return;
    await onEditMessage(editModal.messageId, editModal.value);
    setEditModal(null);
  }

  async function submitCorrectModal() {
    if (!correctModal) return;
    await onCorrectMessage(correctModal.messageId, correctModal.value);
    setCorrectModal(null);
  }

  async function onBlockCurrentUser() {
    if (!accessToken || !selectedChat?.interlocutorId) return;
    const res = await fetch('/api/user/friends/block', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockedUserId: selectedChat.interlocutorId }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(json?.message || 'Failed to block user');
      return;
    }
    toast.success('User blocked');
    setHeaderMenuOpen(false);
    setHiddenChatIds((prev) => (selectedChatId && !prev.includes(selectedChatId) ? [...prev, selectedChatId] : prev));
    setSelectedChatId('');
    setMessages([]);
  }

  function onDeleteCurrentChat() {
    if (!selectedChatId) return;
    setHiddenChatIds((prev) => (!prev.includes(selectedChatId) ? [...prev, selectedChatId] : prev));
    setHeaderMenuOpen(false);
    setSelectedChatId('');
    setMessages([]);
    toast.success('Chat removed from your list');
  }

  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        globalThis.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest('[data-bubble-menu-trigger]') ||
        target?.closest('[data-bubble-menu-panel]') ||
        target?.closest('[data-header-menu-trigger]') ||
        target?.closest('[data-header-menu-panel]')
      ) {
        return;
      }
      setOpenBubbleMenuId('');
      setHeaderMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);
  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl gap-4 bg-[#0b1229] px-4 py-4 text-[#dce1ff] md:px-6 md:py-6">
      <aside className="hidden w-80 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111834] md:flex md:flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <h2 className="text-sm font-bold tracking-[0.16em] text-[#95a7c4] uppercase">Chats</h2>
        </div>
        <div className="border-b border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-xl bg-[#1d2545] px-2.5 py-2">
            <Search className="size-4 text-[#95a7c4]" />
            <input
              value={chatQuery}
              onChange={(event) => setChatQuery(event.target.value)}
              placeholder="Search chats..."
              className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-[#8798b4]"
            />
          </div>
        </div>
        <div className="chat-scrollbar flex-1 overflow-y-auto p-2">
          {loadingChats ? <p className="px-3 py-3 text-sm text-[#95a7c4]">Loading chats...</p> : null}
          {!loadingChats && filteredChats.length === 0 ? <p className="px-3 py-3 text-sm text-[#95a7c4]">No chats found.</p> : null}
          {filteredChats.map((chat) => {
            const active = chat.chatId === selectedChatId;
            const online = chat.interlocutorId ? Boolean(presenceByUserId[chat.interlocutorId]) : false;
            const avatar = chat.interlocutorId ? avatarMap[chat.interlocutorId] || '' : '';
            const cc = codeFromCountry(chat.interlocutorCountry || '');
            const chatStatusIcon =
              chat.unreadIncomingCount > 0 ? (
                <Check className="size-3 text-[#9daccc]" />
              ) : (
                <CheckCheck className="size-3 text-[#9daccc]" />
              );
            return (
              <button
                key={chat.chatId}
                type="button"
                onClick={() => {
                  setSelectedChatId(chat.chatId);
                  router.replace(`/chats?chatId=${encodeURIComponent(chat.chatId)}`);
                }}
                className={`mb-1 w-full rounded-xl px-3 py-3 text-left transition-colors ${
                  active ? 'bg-[#1e2443]' : 'hover:bg-[#1a203c]'
                }`}
              >
                <div className="relative flex items-center justify-between gap-2 pr-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative inline-flex size-9 shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={chat.interlocutorName}
                          className={`size-9 rounded-full object-cover ${
                            online ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#111834]' : ''
                          }`}
                        />
                      ) : (
                        <span
                          className={`flex size-9 items-center justify-center rounded-full bg-[#2a3150] text-xs font-bold ${
                            online ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#111834]' : ''
                          }`}
                        >
                          {(chat.interlocutorName || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      {cc ? (
                        <span className="absolute -right-0.5 -bottom-0.5 inline-flex size-4 items-center justify-center rounded-full bg-[#0b1229]">
                          <CountryFlag countryCode={cc} svg style={{ width: '0.65rem', height: '0.65rem' }} />
                        </span>
                      ) : null}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{chat.interlocutorName}</p>
                      <p className="mt-0.5 truncate text-xs text-[#95a7c4]">{chat.lastMessagePreview || 'Start chatting...'}</p>
                    </div>
                  </div>
                  {chat.unreadIncomingCount > 0 ? (
                    <span className="rounded-full bg-[#00d4ff] px-2 py-0.5 text-xs font-bold text-[#003642]">
                      {chat.unreadIncomingCount}
                    </span>
                  ) : null}
                  <span className="absolute right-0 bottom-0">{chatStatusIcon}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111834]">
        <header className="relative z-20 flex items-center justify-between border-b border-white/10 px-4 py-4">
          <button
            type="button"
            className="flex min-w-0 items-center gap-3 text-left"
            onClick={() => {
              if (!selectedChat) return;
              const idOrUsername = selectedChat.interlocutorUsername || selectedChat.interlocutorId;
              if (!idOrUsername) return;
              router.push(`/profile/${encodeURIComponent(idOrUsername)}`);
            }}
          >
            <span className="relative inline-flex size-10 shrink-0">
              {selectedChatAvatar ? (
                <img
                  src={selectedChatAvatar}
                  alt={selectedChat?.interlocutorName || 'User'}
                  className={`size-10 rounded-full object-cover ${
                    interlocutorOnline ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#111834]' : ''
                  }`}
                />
              ) : (
                <span
                  className={`flex size-10 items-center justify-center rounded-full bg-[#2a3150] text-sm font-bold ${
                    interlocutorOnline ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#111834]' : ''
                  }`}
                >
                  {(selectedChat?.interlocutorName || '?').charAt(0).toUpperCase()}
                </span>
              )}
              {selectedChatCountry ? (
                <span className="absolute -right-0.5 -bottom-0.5 inline-flex size-4 items-center justify-center rounded-full bg-[#0b1229]">
                  <CountryFlag countryCode={selectedChatCountry} svg style={{ width: '0.65rem', height: '0.65rem' }} />
                </span>
              ) : null}
            </span>
            <span className="min-w-0">
              <h1 className="truncate text-base font-semibold">{selectedChat?.interlocutorName || 'Chats'}</h1>
              <p className="text-xs text-[#95a7c4]">
                {remoteTyping ? <span className="font-medium text-emerald-400">Typing…</span> : selectedChat ? '' : 'Select a dialogue to begin'}
              </p>
            </span>
          </button>
          <div className="relative">
            <button
              type="button"
              data-header-menu-trigger
              className="rounded-lg p-2 text-[#95a7c4] hover:bg-[#1e2443]"
              onClick={(event) => {
                event.stopPropagation();
                setHeaderMenuOpen((v) => !v);
              }}
            >
              <MoreVertical className="size-4" />
            </button>
            {headerMenuOpen && selectedChat ? (
              <div
                data-header-menu-panel
                className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-white/15 bg-[#151d39] p-1"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-[#202a4d]"
                  onClick={() => {
                    onDeleteCurrentChat();
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete chat
                </button>
                <button
                  type="button"
                  className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-[#202a4d]"
                  onClick={() => void onBlockCurrentUser()}
                >
                  <Ban className="size-3.5" />
                  Block user
                </button>
                <button
                  type="button"
                  className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-[#202a4d]"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    const idOrUsername = selectedChat.interlocutorUsername || selectedChat.interlocutorId;
                    if (!idOrUsername) return;
                    router.push(`/profile/${encodeURIComponent(idOrUsername)}`);
                  }}
                >
                  <Pencil className="size-3.5" />
                  View profile
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div ref={messagesContainerRef} className="chat-scrollbar relative z-0 flex-1 overflow-y-auto px-4 py-5">
          {!selectedChat ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#95a7c4]">
              <MessageCircle className="mb-3 size-8 text-[#00d4ff]" />
              <p className="text-sm">Select a friend chat to start messaging.</p>
            </div>
          ) : null}
          {selectedChat && loadingMessages ? <p className="text-sm text-[#95a7c4]">Loading messages...</p> : null}
          {selectedChat && !loadingMessages && messages.length === 0 ? (
            <p className="text-sm text-[#95a7c4]">No messages yet. Say hello!</p>
          ) : null}
          {messages.map((message) => {
            const mine = message.senderId === myUserId;
            const menuOpen = openBubbleMenuId === message.id;
            const translationText = mine
              ? message.__aiSuggested
                ? null
                : message.translatedText || null
              : message.translatedText || null;
            return (
              <div key={message.id} className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`relative max-w-[72%] rounded-2xl py-2 pl-3 pr-2 ${
                    mine ? 'bg-[#00cfff] text-[#053545]' : 'bg-[#2a2f52]'
                  } ${mine ? 'pb-6' : ''}`}
                >
                  <button
                    type="button"
                    data-bubble-menu-trigger
                    className="absolute top-2 right-2 z-30 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-current/85 hover:text-current"
                    onClick={(event) => {
                      event.stopPropagation();
                      setHeaderMenuOpen(false);
                      setOpenBubbleMenuId((prev) => (prev === message.id ? '' : message.id));
                    }}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                  {menuOpen ? (
                    <div
                      data-bubble-menu-panel
                      data-bubble-menu-id={message.id}
                      className={`absolute top-9 z-30 w-36 rounded-lg border border-white/20 bg-[#151d39] p-1 text-[#dce1ff] shadow-lg ${
                        mine ? 'right-2' : 'left-full ml-2'
                      }`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {!mine ? (
                        <>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-[#202a4d]"
                            onClick={() => {
                              setOpenBubbleMenuId('');
                              void onTranslateMessage(message.id);
                            }}
                          >
                            <Languages className="size-3.5" />
                            Translate
                          </button>
                          {!message.correctedText ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-[#202a4d]"
                              onClick={() => openActionModal('correct', message)}
                            >
                              <CheckCheck className="size-3.5" />
                              Correct
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-[#202a4d]"
                          onClick={() => openActionModal('edit', message)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                      )}
                    </div>
                  ) : null}
                  <div className="min-w-0 pr-8">
                    <p className="break-words whitespace-pre-wrap text-sm">{message.content ?? ''}</p>
                    {message.correctedText ? (
                      <p className="mt-2 text-xs opacity-85">
                        <strong>Correction:</strong> {message.correctedText}
                      </p>
                    ) : null}
                    {translationText ? (
                      <p className="mt-1 text-xs opacity-85">
                        <strong>Translation:</strong> {translationText}
                      </p>
                    ) : null}
                    {mine ? null : <p className="mt-1 text-[11px] text-[#9daccc]">{formatMessageTime(message.createdAt)}</p>}
                  </div>
                  {mine ? (
                    <div className="absolute right-2 bottom-1 flex items-center gap-1 text-[11px] text-[#0c4d5f]/80">
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {message.__pending ? <Clock3 className="size-3.5" /> : message.read ? <CheckCheck className="size-3.5" /> : <Check className="size-3.5" />}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <footer ref={footerRef} className="relative z-20 border-t border-white/10 px-4 py-3">
          {suggestion ? (
            <div className="mb-2 rounded-lg border border-white/15 bg-[#1a203c] p-2 text-xs">
              <p>
                <strong>Suggested:</strong> {suggestion.suggestion}
              </p>
              <p className="mt-1 text-[#9daccc]">
                <strong>Translated:</strong> {suggestion.translatedSuggestion}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="flex h-8 w-1/2 items-center justify-center gap-2 rounded-md border border-white/20 px-2 py-1"
                  onClick={() => {
                    setDraft(suggestion.suggestion);
                    if (selectedChatId) {
                      lastSuggestionSendRef.current = {
                        chatId: selectedChatId,
                        content: suggestion.suggestion.trim(),
                        translatedSuggestion: suggestion.translatedSuggestion || '',
                      };
                    }
                  }}
                >
                  <Pencil className="size-3.5" />
                  Text
                </button>
                <button
                  type="button"
                  className="flex h-8 w-1/2 items-center justify-center gap-2 rounded-md bg-[#00cfff] px-2 py-1 text-[#053545]"
                  onClick={() => {
                    if (!selectedChatId) return;
                    lastSuggestionSendRef.current = {
                      chatId: selectedChatId,
                      content: suggestion.suggestion.trim(),
                      translatedSuggestion: suggestion.translatedSuggestion || '',
                    };
                    void sendContent(suggestion.suggestion.trim());
                  }}
                >
                  <SendHorizontal className="size-3.5" />
                  Send
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2 rounded-xl bg-[#2a2f52] px-3 py-2">
            <button
              type="button"
              disabled={!selectedChat || suggesting}
              onClick={() => void onGetSuggestion()}
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 text-[#dce1ff] disabled:opacity-50"
              title="Generate suggestion"
            >
              <Lightbulb className="size-4" />
            </button>
            <input
              value={draft}
              onChange={(event) => onType(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void onSendMessage();
                }
              }}
              disabled={!selectedChat || sending}
              className="h-10 flex-1 bg-transparent text-sm text-[#dce1ff] outline-none placeholder:text-[#8b9ab6]"
              placeholder={selectedChat ? 'Type your message...' : 'Select a chat first'}
            />
            <button
              type="button"
              disabled={!selectedChat || sending || draft.trim().length === 0}
              onClick={() => void onSendMessage()}
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#00cfff] text-[#053545] disabled:opacity-50"
            >
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </footer>
      </section>
      {editModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <h3 className="text-base font-semibold">Edit message</h3>
            <textarea
              value={editModal.value}
              onChange={(event) => setEditModal((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
              className="mt-3 min-h-28 w-full rounded-lg border border-white/15 bg-[#1a203c] p-3 text-sm outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-md border border-white/20 px-3 py-1.5 text-sm" onClick={() => setEditModal(null)}>
                Cancel
              </button>
              <button type="button" className="rounded-md bg-[#00cfff] px-3 py-1.5 text-sm text-[#053545]" onClick={() => void submitEditModal()}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {correctModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <h3 className="text-base font-semibold">Add correction</h3>
            <textarea
              value={correctModal.value}
              onChange={(event) => setCorrectModal((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
              className="mt-3 min-h-28 w-full rounded-lg border border-white/15 bg-[#1a203c] p-3 text-sm outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-white/20 px-3 py-1.5 text-sm"
                onClick={() => setCorrectModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#00cfff] px-3 py-1.5 text-sm text-[#053545]"
                onClick={() => void submitCorrectModal()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        .chat-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .chat-scrollbar::-webkit-scrollbar-track {
          background: #151c36;
          border-radius: 999px;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: #2f3d6e;
          border-radius: 999px;
          border: 2px solid #151c36;
        }
      `}</style>
    </div>
  );
}

