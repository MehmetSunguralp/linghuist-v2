import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@linghuist-v2/prisma';
import { GetChatMessagesResponseEnvelopeDto } from './dto/get_chat_messages_response.dto';
import { GetUserChatsResponseEnvelopeDto } from './dto/get_user_chats_response.dto';

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
        createdAt: true,
      },
    });
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
          createdAt: message.createdAt,
        })),
      },
    };
  }
}
