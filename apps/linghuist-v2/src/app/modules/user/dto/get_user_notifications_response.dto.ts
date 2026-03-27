import type { NotificationType, Prisma } from '@prisma/client';

export class UserNotificationItemDto {
  id!: string;
  userId!: string;
  senderId!: string | null;
  type!: NotificationType;
  entityId!: string | null;
  read!: boolean;
  createdAt!: Date;
  metadata!: Prisma.JsonValue | null;
}

export class UserNotificationsDataDto {
  notifications!: UserNotificationItemDto[];
  unreadCount!: number;
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;
  hasNextPage!: boolean;
}

export class GetUserNotificationsResponseEnvelopeDto {
  message!: string;
  data!: UserNotificationsDataDto;
}
