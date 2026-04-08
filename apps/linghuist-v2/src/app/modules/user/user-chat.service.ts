import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from '@linghuist-v2/prisma';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { GetChatMessagesResponseEnvelopeDto } from './dto/get_chat_messages_response.dto';
import { GetUserChatsResponseEnvelopeDto } from './dto/get_user_chats_response.dto';
import { UserNotificationService } from './user-notification.service';
import { CHAT_MESSAGE_MAX_LENGTH } from './user.gateway.constants';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const SUGGESTION_MAX_CHARS = 50;

/** Visible body: latest edit wins over original `content`. */
function messageDisplayText(content: string | null, editedContent: string | null): string | null {
  return editedContent ?? content;
}

/** Truncate at a word boundary when possible; avoids slicing mid-word (e.g. German/English). */
function truncateToMaxLengthAtWordBoundary(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) {
    return t;
  }
  const slice = t.slice(0, maxChars);
  let breakAt = -1;
  for (let i = slice.length - 1; i >= Math.floor(maxChars * 0.35); i--) {
    const c = slice[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\u00A0') {
      breakAt = i;
      break;
    }
  }
  if (breakAt > 0) {
    return slice.slice(0, breakAt).trimEnd();
  }
  return slice.trimEnd();
}

const messageSocketPayloadSelect = {
  id: true,
  chatId: true,
  senderId: true,
  content: true,
  editedContent: true,
  read: true,
  translatedText: true,
  correctedText: true,
  aiSuggestion: true,
  createdAt: true,
} as const;

function toSocketMessagePayload(message: {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  editedContent: string | null;
  read: boolean;
  translatedText: string | null;
  correctedText: string | null;
  aiSuggestion: string | null;
  createdAt: Date;
}) {
  return {
    ...message,
    content: messageDisplayText(message.content, message.editedContent),
    read: Boolean(message.read),
  };
}

@Injectable()
export class UserChatService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userNotificationService: UserNotificationService,
  ) {}

  /**
   * Ensures the user is in the chat, not blocked with any other participant,
   * and has an accepted friend relationship with every other participant.
   */
  async assertChatRoomAccess(userId: string, chatId: string): Promise<void> {
    const isParticipant = await this.isChatParticipant(userId, chatId);
    if (!isParticipant) {
      throw new NotFoundException('Chat not found');
    }
    const participantIds = await this.getChatParticipantUserIds(chatId);
    const otherUserIds = participantIds.filter((id) => id !== userId);
    await this.assertSocialAllowsChatWith(userId, otherUserIds);
  }

  /** Updates online/offline presence timestamps and typing reset rules. */
  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        isOnline,
        isTyping: isOnline ? undefined : false,
        lastOnline: isOnline ? undefined : new Date(),
      },
    });
  }

  /** Persists typing status for presence and chat events. */
  async setTypingStatus(userId: string, isTyping: boolean): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { isTyping },
    });
  }

  /** Checks if the user belongs to the given chat room. */
  async isChatParticipant(userId: string, chatId: string): Promise<boolean> {
    const participant = await this.prismaService.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      select: { id: true },
    });

    return Boolean(participant);
  }

  /** All user IDs in a chat (for inbox / read-receipt fan-out outside `chat:${chatId}`). */
  async getChatParticipantUserIds(chatId: string): Promise<string[]> {
    const rows = await this.prismaService.chatParticipant.findMany({
      where: { chatId },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }

  /** Creates a chat message persisted to the database. */
  async createChatMessage(userId: string, chatId: string, content: string) {
    await this.assertChatRoomAccess(userId, chatId);
    const created = await this.prismaService.message.create({
      data: {
        chatId,
        senderId: userId,
        content,
      },
      select: messageSocketPayloadSelect,
    });
    const recipientUserIds = (await this.getChatParticipantUserIds(chatId)).filter((id) => id !== userId);
    await this.userNotificationService.notifyNewChatMessage({
      senderId: userId,
      chatId,
      messageId: created.id,
      recipientUserIds,
    });
    return toSocketMessagePayload(created);
  }

  /** Marks unread incoming messages as read and returns changed message ids. */
  async markChatAsRead(userId: string, chatId: string): Promise<string[]> {
    await this.assertChatRoomAccess(userId, chatId);

    const unreadMessages = await this.prismaService.message.findMany({
      where: {
        chatId,
        senderId: { not: userId },
        read: false,
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) {
      return [];
    }

    await this.prismaService.message.updateMany({
      where: {
        id: { in: unreadMessages.map((message) => message.id) },
      },
      data: { read: true },
    });

    await this.userNotificationService.markChatMessageNotificationsReadForChat(userId, chatId);

    return unreadMessages.map((message) => message.id);
  }

  /** Stores a manual correction text for an existing message. */
  async manuallyCorrectMessage(
    userId: string,
    messageId: string,
    correctedText: string,
  ): Promise<
    ApiEnvelope<{
      messageId: string;
      correctedText: string;
      chatId: string;
      message: ReturnType<typeof toSocketMessagePayload>;
    }>
  > {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true, correctedText: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.assertChatRoomAccess(userId, message.chatId);
    if (message.senderId === userId) {
      throw new BadRequestException('You can only correct the other user messages');
    }
    if (message.correctedText != null && message.correctedText.trim() !== '') {
      throw new BadRequestException('This message has already been corrected');
    }

    await this.prismaService.message.update({
      where: { id: messageId },
      data: { correctedText },
    });

    const updated = await this.prismaService.message.findUniqueOrThrow({
      where: { id: messageId },
      select: messageSocketPayloadSelect,
    });

    return {
      message: 'Message corrected successfully',
      data: {
        messageId,
        correctedText,
        chatId: message.chatId,
        message: toSocketMessagePayload(updated),
      },
    };
  }

  /** Generates translation with Groq and persists translated text on the message. */
  async translateMessageWithAi(
    userId: string,
    messageId: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<ApiEnvelope<{ messageId: string; translatedText: string }>> {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true, content: true, editedContent: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.assertChatRoomAccess(userId, message.chatId);
    if (message.senderId === userId) {
      throw new BadRequestException('You can only translate the other user messages');
    }
    const sourceText = messageDisplayText(message.content, message.editedContent);
    if (!sourceText?.trim()) {
      throw new BadRequestException('Message has no content to translate');
    }

    const prompt = [
      'Translate the following chat message.',
      sourceLanguage ? `Source language: ${sourceLanguage}.` : '',
      `Target language: ${targetLanguage}.`,
      'Return only the translated text without explanation.',
      `Message: ${sourceText}`,
    ]
      .filter(Boolean)
      .join('\n');

    const translatedText = await this.generateWithGroq(prompt, 180);

    await this.prismaService.message.update({
      where: { id: messageId },
      data: { translatedText },
    });

    return {
      message: 'Message translated successfully',
      data: {
        messageId,
        translatedText,
      },
    };
  }

  /** Suggests the next message from last 5 messages and translates for user language. */
  async suggestNextMessage(
    userId: string,
    chatId: string,
    userLanguage: string,
    chatLanguage?: string,
  ): Promise<ApiEnvelope<{ suggestion: string; translatedSuggestion: string }>> {
    await this.assertChatRoomAccess(userId, chatId);

    const recentMessages = await this.prismaService.message.findMany({
      where: { chatId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        content: true,
        editedContent: true,
      },
    });

    if (recentMessages.length === 0) {
      throw new BadRequestException('Not enough messages to generate suggestion');
    }

    const contextMessages = [...recentMessages]
      .reverse()
      .map((message) => messageDisplayText(message.content, message.editedContent)?.trim())
      .filter((content): content is string => Boolean(content))
      .map((content, index) => `${index + 1}. ${content}`)
      .join('\n');

    const suggestionPrompt = [
      'You are generating a short next chat message suggestion.',
      chatLanguage ? `Write it in ${chatLanguage}.` : 'Write it in the same language as the context.',
      `Keep it under ${SUGGESTION_MAX_CHARS} characters.`,
      'Return only one plain-text suggestion, no quotes, no explanation.',
      `Context:\n${contextMessages}`,
    ].join('\n');
    let suggestion = await this.generateWithGroq(suggestionPrompt, 90);
    suggestion = truncateToMaxLengthAtWordBoundary(suggestion, SUGGESTION_MAX_CHARS);

    const translationPrompt = [
      'Translate the following sentence.',
      `Target language: ${userLanguage}.`,
      'Return only translated text.',
      `Sentence: ${suggestion}`,
    ].join('\n');
    const translatedSuggestion = await this.generateWithGroq(translationPrompt, 120);

    const latestMessage = await this.prismaService.message.findFirst({
      where: { chatId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (latestMessage) {
      await this.prismaService.message.update({
        where: { id: latestMessage.id },
        data: { aiSuggestion: suggestion },
      });
    }

    return {
      message: 'Suggestion generated successfully',
      data: {
        suggestion,
        translatedSuggestion,
      },
    };
  }

  /**
   * Returns an existing 1:1 chat id with `otherUserId`, or creates `Chat` + participants.
   * Requires accepted friendship and no block (same rules as messaging).
   */
  async ensureDirectChatWithUser(userId: string, otherUserId: string): Promise<ApiEnvelope<{ chatId: string }>> {
    if (otherUserId === userId) {
      throw new BadRequestException('Invalid recipient');
    }
    const otherExists = await this.prismaService.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!otherExists) {
      throw new NotFoundException('User not found');
    }
    await this.assertSocialAllowsChatWith(userId, [otherUserId]);

    const existingId = await this.findDirectChatBetween(userId, otherUserId);
    if (existingId) {
      return { message: 'Chat ready', data: { chatId: existingId } };
    }

    const created = await this.prismaService.$transaction(async (tx) => {
      const chat = await tx.chat.create({ data: {} });
      await tx.chatParticipant.createMany({
        data: [
          { chatId: chat.id, userId },
          { chatId: chat.id, userId: otherUserId },
        ],
      });
      return chat;
    });

    return { message: 'Chat created', data: { chatId: created.id } };
  }

  /** Returns chat list with interlocutor metadata and latest message preview. */
  async getMyChats(userId: string): Promise<GetUserChatsResponseEnvelopeDto> {
    const allowedIds = await this.getAllowedChatIdsForUser(userId);
    if (allowedIds.length === 0) {
      return {
        message: 'Chats retrieved successfully',
        data: { chats: [] },
      };
    }

    const chats = await this.prismaService.chat.findMany({
      where: { id: { in: allowedIds } },
      select: {
        id: true,
        participants: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
                thumbnailUrl: true,
                country: true,
              },
            },
          },
        },
        messages: {
          select: {
            content: true,
            editedContent: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const unreadGroups = await this.prismaService.message.groupBy({
      by: ['chatId'],
      where: {
        chatId: { in: allowedIds },
        read: false,
        senderId: { not: userId },
      },
      _count: { _all: true },
    });
    const unreadByChatId = Object.fromEntries(unreadGroups.map((g) => [g.chatId, g._count._all]));

    return {
      message: 'Chats retrieved successfully',
      data: {
        chats: chats.map((chat) => {
          const interlocutor = chat.participants.map((p) => p.user).find((u) => u.id !== userId) ?? null;
          const lastMessage = chat.messages[0] ?? null;

          return {
            chatId: chat.id,
            interlocutorId: interlocutor?.id ?? null,
            interlocutorName: interlocutor?.name || interlocutor?.username || interlocutor?.id || 'Unknown user',
            interlocutorUsername: interlocutor?.username ?? null,
            interlocutorAvatarUrl: interlocutor?.thumbnailUrl ?? interlocutor?.avatarUrl ?? null,
            interlocutorCountry: interlocutor?.country ?? null,
            lastMessagePreview: messageDisplayText(lastMessage?.content ?? null, lastMessage?.editedContent ?? null),
            lastMessageAt: lastMessage?.createdAt ?? null,
            unreadIncomingCount: unreadByChatId[chat.id] ?? 0,
          };
        }),
      },
    };
  }

  /** Chats (social-allowed) with at least one unread incoming message. */
  async getUnreadChatThreadCount(userId: string): Promise<number> {
    const allowedIds = await this.getAllowedChatIdsForUser(userId);
    if (allowedIds.length === 0) {
      return 0;
    }
    const grouped = await this.prismaService.message.groupBy({
      by: ['chatId'],
      where: {
        chatId: { in: allowedIds },
        read: false,
        senderId: { not: userId },
      },
      _count: { _all: true },
    });
    return grouped.length;
  }

  /** Updates own message text, clears cached translation, preserves original in `content`. */
  async editOwnMessage(
    userId: string,
    messageId: string,
    newContent: string,
  ): Promise<
    ApiEnvelope<{
      chatId: string;
      message: ReturnType<typeof toSocketMessagePayload>;
    }>
  > {
    const trimmed = newContent.trim();
    if (!trimmed) {
      throw new BadRequestException('Message content is required');
    }
    if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('Message is too long');
    }

    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true, content: true, editedContent: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.assertChatRoomAccess(userId, message.chatId);
    if (message.senderId !== userId) {
      throw new BadRequestException('You can only edit your own messages');
    }
    if (message.editedContent != null && message.editedContent.trim() !== '') {
      throw new BadRequestException('You can only edit a message once');
    }
    const previous = messageDisplayText(message.content, message.editedContent);
    if (trimmed === previous) {
      throw new BadRequestException('Message is unchanged');
    }

    const updated = await this.prismaService.message.update({
      where: { id: messageId },
      data: {
        editedContent: trimmed,
        translatedText: null,
      },
      select: messageSocketPayloadSelect,
    });

    return {
      message: 'Message updated successfully',
      data: {
        chatId: message.chatId,
        message: toSocketMessagePayload(updated),
      },
    };
  }

  /** Returns paginated message history for a chat participant (latest first page, older on demand). */
  async getChatMessages(
    userId: string,
    chatId: string,
    before?: string,
    takeRaw?: string,
  ): Promise<GetChatMessagesResponseEnvelopeDto> {
    await this.assertChatRoomAccess(userId, chatId);
    const parsedTake = Number(takeRaw);
    const take = Number.isFinite(parsedTake) && parsedTake > 0 ? Math.min(Math.floor(parsedTake), 100) : 40;
    const [beforeTsRaw, beforeIdRaw] = (before || '').split('::');
    const beforeDate = beforeTsRaw ? new Date(beforeTsRaw) : null;
    const beforeId = beforeIdRaw?.trim() || '';
    const hasBefore = Boolean(beforeDate && !Number.isNaN(beforeDate.getTime()));

    const messages = await this.prismaService.message.findMany({
      where: {
        chatId,
        ...(hasBefore
          ? {
              OR: [
                { createdAt: { lt: beforeDate as Date } },
                ...(beforeId
                  ? [
                      {
                        AND: [{ createdAt: beforeDate as Date }, { id: { lt: beforeId } }],
                      },
                    ]
                  : []),
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: {
        id: true,
        chatId: true,
        senderId: true,
        content: true,
        editedContent: true,
        read: true,
        translatedText: true,
        correctedText: true,
        aiSuggestion: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
    const hasMore = messages.length > take;
    const slice = hasMore ? messages.slice(0, take) : messages;
    const ordered = [...slice].reverse();
    const oldest = ordered[0] ?? null;

    return {
      message: 'Messages retrieved successfully',
      data: {
        chatId,
        hasMore,
        nextBefore: oldest ? `${oldest.createdAt.toISOString()}::${oldest.id}` : null,
        messages: ordered.map((message) => ({
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          senderName: message.sender?.name || message.sender?.username || message.senderId,
          content: messageDisplayText(message.content, message.editedContent),
          editedContent: message.editedContent,
          read: message.read,
          translatedText: message.translatedText,
          correctedText: message.correctedText,
          aiSuggestion: message.aiSuggestion,
          createdAt: message.createdAt,
        })),
      },
    };
  }

  /** 1:1 thread between exactly these two users, if any. */
  private async findDirectChatBetween(userId: string, otherUserId: string): Promise<string | null> {
    const rows = await this.prismaService.chat.findMany({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
          {
            participants: {
              every: {
                userId: { in: [userId, otherUserId] },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        _count: { select: { participants: true } },
      },
    });
    const dm = rows.find((r) => r._count.participants === 2);
    return dm?.id ?? null;
  }

  private async getAllowedChatIdsForUser(userId: string): Promise<string[]> {
    const chats = await this.prismaService.chat.findMany({
      where: {
        participants: { some: { userId } },
      },
      select: {
        id: true,
        participants: {
          select: {
            user: { select: { id: true } },
          },
        },
      },
    });
    const ids: string[] = [];
    for (const chat of chats) {
      const otherUserIds = chat.participants.map((p) => p.user.id).filter((id) => id !== userId);
      if (await this.socialAllowsChatWith(userId, otherUserIds)) {
        ids.push(chat.id);
      }
    }
    return ids;
  }

  private async assertSocialAllowsChatWith(userId: string, otherUserIds: string[]): Promise<void> {
    if (otherUserIds.length === 0) {
      return;
    }
    for (const otherId of otherUserIds) {
      if (await this.isBlockedPair(userId, otherId)) {
        throw new ForbiddenException('You cannot use this chat');
      }
      if (!(await this.areAcceptedFriends(userId, otherId))) {
        throw new ForbiddenException('You can only chat with accepted friends');
      }
    }
  }

  /** Non-throwing social check for list filters. */
  private async socialAllowsChatWith(userId: string, otherUserIds: string[]): Promise<boolean> {
    if (otherUserIds.length === 0) {
      return true;
    }
    for (const otherId of otherUserIds) {
      if (await this.isBlockedPair(userId, otherId)) {
        return false;
      }
      if (!(await this.areAcceptedFriends(userId, otherId))) {
        return false;
      }
    }
    return true;
  }

  private async isBlockedPair(a: string, b: string): Promise<boolean> {
    const block = await this.prismaService.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { id: true },
    });
    return Boolean(block);
  }

  private async areAcceptedFriends(a: string, b: string): Promise<boolean> {
    const request = await this.prismaService.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { senderId: a, receiverId: b },
          { senderId: b, receiverId: a },
        ],
      },
      select: { id: true },
    });
    return Boolean(request);
  }

  private async generateWithGroq(prompt: string, maxTokens: number): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('GROQ_API_KEY is not configured');
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('AI request failed');
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new InternalServerErrorException('AI returned empty response');
    }

    return content;
  }
}
