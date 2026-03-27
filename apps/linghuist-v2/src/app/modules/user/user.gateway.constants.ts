export const USER_GATEWAY_NAMESPACE = 'api/user';

export const USER_SOCKET_EVENTS = {
  PRESENCE_UPDATED: 'presence:updated',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_TYPING: 'chat:typing',
  CHAT_MESSAGE: 'chat:message',
  CHAT_READ: 'chat:read',
} as const;

export const CHAT_MESSAGE_MAX_LENGTH = 2000;
