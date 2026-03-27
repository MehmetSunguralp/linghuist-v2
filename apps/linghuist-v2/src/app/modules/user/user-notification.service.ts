import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { PrismaService } from '@linghuist-v2/prisma';
import { USER_NOTIFICATIONS_DEFAULT_PAGE_SIZE } from './user.constants';
import { GetUserNotificationsResponseEnvelopeDto } from './dto/get_user_notifications_response.dto';

@Injectable()
export class UserNotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Unread count for notification bell (friend / like / comment only). */
  async getSocialUnreadCount(userId: string): Promise<number> {
    return this.prismaService.notification.count({
      where: {
        userId,
        read: false,
        type: { not: NotificationType.CHAT_MESSAGE },
      },
    });
  }

  /** One row per recipient when someone sends a chat message (`entityId` = chatId). */
  async notifyNewChatMessage(args: {
    senderId: string;
    chatId: string;
    messageId: string;
    recipientUserIds: string[];
  }): Promise<void> {
    const { senderId, chatId, messageId, recipientUserIds } = args;
    if (recipientUserIds.length === 0) {
      return;
    }
    await this.prismaService.notification.createMany({
      data: recipientUserIds.map((userId) => ({
        userId,
        senderId,
        type: NotificationType.CHAT_MESSAGE,
        entityId: chatId,
        read: false,
        metadata: { messageId } as Prisma.InputJsonValue,
      })),
    });
  }

  async notifyFriendRequestReceived(receiverId: string, senderId: string, requestId: string): Promise<void> {
    await this.prismaService.notification.create({
      data: {
        userId: receiverId,
        senderId,
        type: NotificationType.FRIEND_REQUEST,
        entityId: requestId,
        read: false,
      },
    });
  }

  /** Original requester gets notified when the receiver accepts. */
  async notifyFriendRequestAccepted(
    accepterUserId: string,
    originalSenderId: string,
    requestId: string,
  ): Promise<void> {
    await this.prismaService.notification.create({
      data: {
        userId: originalSenderId,
        senderId: accepterUserId,
        type: NotificationType.FRIEND_ACCEPTED,
        entityId: requestId,
        read: false,
      },
    });
  }

  /** Clears CHAT_MESSAGE unread rows when the user reads the thread (optional consistency with DB). */
  async markChatMessageNotificationsReadForChat(userId: string, chatId: string): Promise<void> {
    await this.prismaService.notification.updateMany({
      where: {
        userId,
        type: NotificationType.CHAT_MESSAGE,
        entityId: chatId,
        read: false,
      },
      data: { read: true },
    });
  }

  /** Returns paginated notifications with unread count. */
  async getMyNotifications(
    userId: string,
    page: number,
    pageSize = USER_NOTIFICATIONS_DEFAULT_PAGE_SIZE,
    chatUnreadThreadCount: number,
  ): Promise<GetUserNotificationsResponseEnvelopeDto> {
    const normalizedPageSize = Math.min(Math.max(1, Math.floor(pageSize)), 50);
    const normalizedPage = Math.max(1, Math.floor(page));

    const whereSocial = {
      userId,
      type: { not: NotificationType.CHAT_MESSAGE },
    };

    const [total, unreadCount, notifications] = await this.prismaService.$transaction([
      this.prismaService.notification.count({ where: whereSocial }),
      this.prismaService.notification.count({
        where: { ...whereSocial, read: false },
      }),
      this.prismaService.notification.findMany({
        where: whereSocial,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));

    return {
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        unreadCount,
        chatUnreadThreadCount,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        totalPages,
        hasNextPage: normalizedPage < totalPages,
      },
    };
  }

  /** Marks one notification as read for the authenticated user. */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<ApiEnvelope<null>> {
    const existing = await this.prismaService.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.prismaService.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return {
      message: 'Notification marked as read',
      data: null,
    };
  }
}
