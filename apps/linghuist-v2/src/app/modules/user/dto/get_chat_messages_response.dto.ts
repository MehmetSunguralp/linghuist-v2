export class ChatMessageItemDto {
  id!: string;
  chatId!: string;
  senderId!: string;
  senderName!: string;
  content!: string | null;
  /// Set when the sender edited; visible text is always `content` in API responses.
  editedContent!: string | null;
  read!: boolean;
  translatedText!: string | null;
  correctedText!: string | null;
  aiSuggestion!: string | null;
  createdAt!: Date;
}

export class ChatMessagesDataDto {
  chatId!: string;
  messages!: ChatMessageItemDto[];
}

export class GetChatMessagesResponseEnvelopeDto {
  message!: string;
  data!: ChatMessagesDataDto;
}
