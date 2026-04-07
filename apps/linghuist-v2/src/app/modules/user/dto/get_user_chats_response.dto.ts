export class UserChatItemDto {
  chatId!: string;
  interlocutorId!: string | null;
  interlocutorName!: string;
  interlocutorUsername!: string | null;
  interlocutorAvatarUrl!: string | null;
  interlocutorCountry!: string | null;
  lastMessagePreview!: string | null;
  lastMessageAt!: Date | null;
  /** Unread messages from others in this chat (for list dots). */
  unreadIncomingCount!: number;
}

export class UserChatsDataDto {
  chats!: UserChatItemDto[];
}

export class GetUserChatsResponseEnvelopeDto {
  message!: string;
  data!: UserChatsDataDto;
}
