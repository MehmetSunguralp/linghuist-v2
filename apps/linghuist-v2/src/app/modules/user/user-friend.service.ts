import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus } from '@prisma/client';
import { PrismaService } from '@linghuist-v2/prisma';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import type { ViewerProfileRelation } from './dto/get_user_by_username_response.dto';
import { FriendRequestsListEnvelopeDto, FriendsListEnvelopeDto } from './dto/friend_requests_response.dto';
import { UserNotificationService } from './user-notification.service';

const peerSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  thumbnailUrl: true,
  country: true,
} as const;

@Injectable()
export class UserFriendService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userNotificationService: UserNotificationService,
  ) {}

  async sendFriendRequest(senderId: string, receiverId: string): Promise<ApiEnvelope<{ requestId: string }>> {
    if (receiverId === senderId) {
      throw new BadRequestException('Cannot send a friend request to yourself');
    }
    const [receiver, existingAccepted] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: receiverId },
        select: { id: true },
      }),
      this.prismaService.friendRequest.findFirst({
        where: {
          status: FriendRequestStatus.ACCEPTED,
          OR: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        },
        select: { id: true },
      }),
    ]);
    if (!receiver) {
      throw new NotFoundException('User not found');
    }
    if (existingAccepted) {
      throw new ConflictException('You are already friends with this user');
    }
    if (await this.isBlockedBetweenUsers(senderId, receiverId)) {
      throw new ForbiddenException('Cannot send a friend request to this user');
    }

    const pendingBetween = await this.prismaService.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.PENDING,
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      select: { id: true },
    });
    if (pendingBetween) {
      throw new ConflictException('A friend request is already pending between you and this user');
    }

    const created = await this.prismaService.friendRequest.create({
      data: { senderId, receiverId, status: FriendRequestStatus.PENDING },
      select: { id: true },
    });

    await this.userNotificationService.notifyFriendRequestReceived(receiverId, senderId, created.id);

    return {
      message: 'Friend request sent',
      data: { requestId: created.id },
    };
  }

  async listIncomingFriendRequests(userId: string): Promise<FriendRequestsListEnvelopeDto> {
    const rows = await this.prismaService.friendRequest.findMany({
      where: { receiverId: userId, status: FriendRequestStatus.PENDING },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        createdAt: true,
        sender: { select: peerSelect },
      },
    });
    return {
      message: 'Incoming friend requests',
      data: {
        requests: rows.map((row) => ({
          id: row.id,
          status: row.status,
          createdAt: row.createdAt,
          peer: row.sender,
        })),
      },
    };
  }

  async listOutgoingFriendRequests(userId: string): Promise<FriendRequestsListEnvelopeDto> {
    const rows = await this.prismaService.friendRequest.findMany({
      where: { senderId: userId, status: FriendRequestStatus.PENDING },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        createdAt: true,
        receiver: { select: peerSelect },
      },
    });
    return {
      message: 'Outgoing friend requests',
      data: {
        requests: rows.map((row) => ({
          id: row.id,
          status: row.status,
          createdAt: row.createdAt,
          peer: row.receiver,
        })),
      },
    };
  }

  async listFriends(userId: string): Promise<FriendsListEnvelopeDto> {
    const rows = await this.prismaService.friendRequest.findMany({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        senderId: true,
        receiverId: true,
        sender: { select: peerSelect },
        receiver: { select: peerSelect },
      },
    });

    const friends = rows.map((row) => (row.senderId === userId ? row.receiver : row.sender));
    const deduped = [...new Map(friends.map((friend) => [friend.id, friend])).values()];
    return {
      message: 'Friends list',
      data: { friends: deduped },
    };
  }

  async acceptFriendRequest(
    userId: string,
    requestId: string,
  ): Promise<ApiEnvelope<{ requestId: string; otherUserId: string }>> {
    const request = await this.prismaService.friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: FriendRequestStatus.PENDING },
      select: { id: true, senderId: true },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    await this.prismaService.friendRequest.update({
      where: { id: requestId },
      data: { status: FriendRequestStatus.ACCEPTED },
    });

    await this.userNotificationService.notifyFriendRequestAccepted(userId, request.senderId, requestId);

    return {
      message: 'Friend request accepted',
      data: { requestId, otherUserId: request.senderId },
    };
  }

  async rejectFriendRequest(userId: string, requestId: string): Promise<ApiEnvelope<{ requestId: string }>> {
    const request = await this.prismaService.friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: FriendRequestStatus.PENDING },
      select: { id: true },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    await this.prismaService.friendRequest.update({
      where: { id: requestId },
      data: { status: FriendRequestStatus.REJECTED },
    });

    return {
      message: 'Friend request rejected',
      data: { requestId },
    };
  }

  async isBlockedBetweenUsers(a: string, b: string): Promise<boolean> {
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

  async getViewerRelation(viewerId: string, profileUserId: string): Promise<ViewerProfileRelation> {
    if (viewerId === profileUserId) {
      return 'SELF';
    }

    const accepted = await this.prismaService.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { senderId: viewerId, receiverId: profileUserId },
          { senderId: profileUserId, receiverId: viewerId },
        ],
      },
      select: { id: true },
    });
    if (accepted) {
      return 'FRIEND';
    }

    const pendingOut = await this.prismaService.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.PENDING,
        senderId: viewerId,
        receiverId: profileUserId,
      },
      select: { id: true },
    });
    if (pendingOut) {
      return 'OUTGOING_PENDING';
    }

    const pendingIn = await this.prismaService.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.PENDING,
        senderId: profileUserId,
        receiverId: viewerId,
      },
      select: { id: true },
    });
    if (pendingIn) {
      return 'INCOMING_PENDING';
    }

    return 'NONE';
  }

  async removeFriend(userId: string, otherUserId: string): Promise<ApiEnvelope<null>> {
    if (otherUserId === userId) {
      throw new BadRequestException('Invalid user');
    }
    const row = await this.prismaService.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Friendship not found');
    }
    await this.prismaService.friendRequest.delete({ where: { id: row.id } });
    return { message: 'Friend removed', data: null };
  }

  async blockUser(blockerId: string, blockedId: string): Promise<ApiEnvelope<null>> {
    if (blockedId === blockerId) {
      throw new BadRequestException('Cannot block yourself');
    }
    const target = await this.prismaService.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.prismaService.block.findFirst({
      where: { blockerId, blockedId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('User is already blocked');
    }
    await this.prismaService.block.create({
      data: { blockerId, blockedId },
    });
    await this.prismaService.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: blockerId, receiverId: blockedId },
          { senderId: blockedId, receiverId: blockerId },
        ],
      },
    });
    return { message: 'User blocked', data: null };
  }
}
