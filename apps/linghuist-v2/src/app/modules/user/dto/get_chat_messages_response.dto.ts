export class ChatMessageItemDto {
  id!: string;
  chatId!: string;
  senderId!: string;
  senderName!: string;
  content!: string | null;
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
