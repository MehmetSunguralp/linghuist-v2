export class UserChatItemDto {
  chatId!: string;
  interlocutorId!: string | null;
  interlocutorName!: string;
  interlocutorUsername!: string | null;
  lastMessagePreview!: string | null;
  lastMessageAt!: Date | null;
}

export class UserChatsDataDto {
  chats!: UserChatItemDto[];
}

export class GetUserChatsResponseEnvelopeDto {
  message!: string;
  data!: UserChatsDataDto;
}
