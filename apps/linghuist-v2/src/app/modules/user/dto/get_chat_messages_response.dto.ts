export class ChatMessageItemDto {
  id!: string;
  chatId!: string;
  senderId!: string;
  senderName!: string;
  content!: string | null;
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
