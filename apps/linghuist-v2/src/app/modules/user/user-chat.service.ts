import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@linghuist-v2/prisma';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { GetChatMessagesResponseEnvelopeDto } from './dto/get_chat_messages_response.dto';
import { GetUserChatsResponseEnvelopeDto } from './dto/get_user_chats_response.dto';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const SUGGESTION_MAX_CHARS = 50;

@Injectable()
export class UserChatService {
  constructor(private readonly prismaService: PrismaService) {}

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
    return this.prismaService.message.create({
      data: {
        chatId,
        senderId: userId,
        content,
      },
      select: {
        id: true,
        chatId: true,
        senderId: true,
        content: true,
        read: true,
        translatedText: true,
        correctedText: true,
        aiSuggestion: true,
        createdAt: true,
      },
    });
  }

  /** Marks unread incoming messages as read and returns changed message ids. */
  async markChatAsRead(userId: string, chatId: string): Promise<string[]> {
    const isParticipant = await this.isChatParticipant(userId, chatId);
    if (!isParticipant) {
      throw new NotFoundException('Chat not found');
    }

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

    return unreadMessages.map((message) => message.id);
  }

  /** Stores a manual correction text for an existing message. */
  async manuallyCorrectMessage(
    userId: string,
    messageId: string,
    correctedText: string,
  ): Promise<ApiEnvelope<{ messageId: string; correctedText: string }>> {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true, correctedText: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isParticipant = await this.isChatParticipant(userId, message.chatId);
    if (!isParticipant) {
      throw new NotFoundException('Message not found');
    }
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

    return {
      message: 'Message corrected successfully',
      data: {
        messageId,
        correctedText,
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
      select: { id: true, chatId: true, senderId: true, content: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isParticipant = await this.isChatParticipant(userId, message.chatId);
    if (!isParticipant) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId === userId) {
      throw new BadRequestException('You can only translate the other user messages');
    }
    if (!message.content?.trim()) {
      throw new BadRequestException('Message has no content to translate');
    }

    const prompt = [
      'Translate the following chat message.',
      sourceLanguage ? `Source language: ${sourceLanguage}.` : '',
      `Target language: ${targetLanguage}.`,
      'Return only the translated text without explanation.',
      `Message: ${message.content}`,
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
    const isParticipant = await this.isChatParticipant(userId, chatId);
    if (!isParticipant) {
      throw new NotFoundException('Chat not found');
    }

    const recentMessages = await this.prismaService.message.findMany({
      where: { chatId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        content: true,
      },
    });

    if (recentMessages.length === 0) {
      throw new BadRequestException('Not enough messages to generate suggestion');
    }

    const contextMessages = [...recentMessages]
      .reverse()
      .map((message) => message.content?.trim())
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
    suggestion = suggestion.slice(0, SUGGESTION_MAX_CHARS);

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

  /** Returns chat list with interlocutor metadata and latest message preview. */
  async getMyChats(userId: string): Promise<GetUserChatsResponseEnvelopeDto> {
    const chats = await this.prismaService.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      select: {
        id: true,
        participants: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
        messages: {
          select: {
            content: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

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
            lastMessagePreview: lastMessage?.content ?? null,
            lastMessageAt: lastMessage?.createdAt ?? null,
          };
        }),
      },
    };
  }

  /** Returns full chronological message history for a chat participant. */
  async getChatMessages(userId: string, chatId: string): Promise<GetChatMessagesResponseEnvelopeDto> {
    const isParticipant = await this.isChatParticipant(userId, chatId);
    if (!isParticipant) {
      throw new NotFoundException('Chat not found');
    }

    const messages = await this.prismaService.message.findMany({
      where: { chatId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        chatId: true,
        senderId: true,
        content: true,
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

    return {
      message: 'Messages retrieved successfully',
      data: {
        chatId,
        messages: messages.map((message) => ({
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          senderName: message.sender?.name || message.sender?.username || message.senderId,
          content: message.content,
          read: message.read,
          translatedText: message.translatedText,
          correctedText: message.correctedText,
          aiSuggestion: message.aiSuggestion,
          createdAt: message.createdAt,
        })),
      },
    };
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
