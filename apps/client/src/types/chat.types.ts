export type ChatListItem = {
  chatId: string;
  interlocutorId: string | null;
  interlocutorName: string;
  interlocutorUsername: string | null;
  interlocutorAvatarUrl: string | null;
  interlocutorCountry: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadIncomingCount: number;
};

export type ChatListEnvelope = {
  message: string;
  data: {
    chats: ChatListItem[];
  };
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  content: string | null;
  editedContent?: string | null;
  read: boolean;
  translatedText?: string | null;
  correctedText?: string | null;
  aiSuggestion?: string | null;
  createdAt: string;
};

export type ChatMessagesEnvelope = {
  message: string;
  data: {
    chatId: string;
    messages: ChatMessage[];
  };
};

export type OpenChatEnvelope = {
  message: string;
  data: {
    chatId: string;
  };
};

export type ChatTypingPayload = {
  chatId: string;
  userId: string;
  isTyping: boolean;
};

export type ChatReadPayload = {
  chatId: string;
  readByUserId: string;
  messageIds: string[];
};

