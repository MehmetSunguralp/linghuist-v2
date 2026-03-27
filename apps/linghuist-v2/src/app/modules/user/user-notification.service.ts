import { Injectable, NotFoundException } from '@nestjs/common';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { PrismaService } from '@linghuist-v2/prisma';
import { USER_NOTIFICATIONS_DEFAULT_PAGE_SIZE } from './user.constants';
import { GetUserNotificationsResponseEnvelopeDto } from './dto/get_user_notifications_response.dto';

@Injectable()
export class UserNotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Returns paginated notifications with unread count. */
  async getMyNotifications(
    userId: string,
    page: number,
    pageSize = USER_NOTIFICATIONS_DEFAULT_PAGE_SIZE,
  ): Promise<GetUserNotificationsResponseEnvelopeDto> {
    const normalizedPageSize = Math.min(Math.max(1, Math.floor(pageSize)), 50);
    const normalizedPage = Math.max(1, Math.floor(page));

    const where = { userId };
    const [total, unreadCount, notifications] = await this.prismaService.$transaction([
      this.prismaService.notification.count({ where }),
      this.prismaService.notification.count({ where: { userId, read: false } }),
      this.prismaService.notification.findMany({
        where,
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
