export const USER_GATEWAY_NAMESPACE = 'api/user';

export const USER_SOCKET_EVENTS = {
  PRESENCE_UPDATED: 'presence:updated',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_TYPING: 'chat:typing',
  CHAT_MESSAGE: 'chat:message',
  CHAT_READ: 'chat:read',
  /** Sidebar / chat list: emitted to each participant's `user:${userId}` room. */
  CHAT_INBOX_UPDATED: 'chat:inbox:updated',
  /** Full message row after edit (same shape as chat:message payload fields). */
  CHAT_MESSAGE_UPDATED: 'chat:message:updated',
  /**
   * Emitted to `user:${userId}` — chat tab vs notification bell badges.
   * `unreadChatThreads`: chats (allowed by social rules) with unread incoming messages.
   * `socialUnreadCount`: unread rows excluding CHAT_MESSAGE (friend / like / comment).
   */
  NAV_BADGES_UPDATED: 'nav:badges:updated',
} as const;

export const CHAT_MESSAGE_MAX_LENGTH = 2000;
