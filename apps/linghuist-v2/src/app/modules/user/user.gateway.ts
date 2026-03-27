import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@linghuist-v2/supabase';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { CHAT_MESSAGE_MAX_LENGTH, USER_GATEWAY_NAMESPACE, USER_SOCKET_EVENTS } from './user.gateway.constants';
import type { AuthenticatedSocket } from './types/user.gateway.types';
import { requireSocketBoolean, requireSocketString } from './utils/user.gateway.utils';
import { UserService } from './user.service';

@WebSocketGateway({
  namespace: USER_GATEWAY_NAMESPACE,
  cors: { origin: true, credentials: true },
})
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(UserGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly userService: UserService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) {
      client.disconnect(true);
      return;
    }

    const userId = data.user.id;
    client.data.userId = userId;
    await client.join(this.getUserRoom(userId));

    this.emitNavigationBadgesForUser(userId);

    await this.userService.setOnlineStatus(userId, true);
    this.server.emit(USER_SOCKET_EVENTS.PRESENCE_UPDATED, {
      userId,
      isOnline: true,
      isTyping: false,
    });
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    try {
      await this.userService.setOnlineStatus(userId, false);
      this.server.emit(USER_SOCKET_EVENTS.PRESENCE_UPDATED, {
        userId,
        isOnline: false,
        isTyping: false,
      });
    } catch (error) {
      this.logger.warn({
        context: 'UserGateway.handleDisconnect',
        event: 'disconnectPresenceUpdateFailed',
        userId,
        message: error instanceof Error ? error.message : 'Presence update failed on disconnect',
      });
    }
  }

  @SubscribeMessage(USER_SOCKET_EVENTS.CHAT_JOIN)
  async onChatJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: unknown,
  ): Promise<{ chatId: string }> {
    const userId = this.requireUserId(client);
    const chatId = requireSocketString((payload as { chatId?: unknown })?.chatId, 'chatId');

    await this.assertParticipant(userId, chatId);
    await client.join(this.getChatRoom(chatId));
    return { chatId };
  }

  @SubscribeMessage(USER_SOCKET_EVENTS.CHAT_LEAVE)
  async onChatLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: unknown,
  ): Promise<{ chatId: string }> {
    const chatId = requireSocketString((payload as { chatId?: unknown })?.chatId, 'chatId');
    await client.leave(this.getChatRoom(chatId));
    return { chatId };
  }

  @SubscribeMessage(USER_SOCKET_EVENTS.CHAT_TYPING)
  async onChatTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const userId = this.requireUserId(client);
    const body = payload as { chatId?: unknown; isTyping?: unknown };
    const chatId = requireSocketString(body?.chatId, 'chatId');
    const isTyping = requireSocketBoolean(body?.isTyping, 'isTyping');

    await this.assertParticipant(userId, chatId);
    await this.userService.setTypingStatus(userId, isTyping);

    this.server.to(this.getChatRoom(chatId)).emit(USER_SOCKET_EVENTS.CHAT_TYPING, {
      chatId,
      userId,
      isTyping,
    });

    this.server.emit(USER_SOCKET_EVENTS.PRESENCE_UPDATED, {
      userId,
      isOnline: true,
      isTyping,
    });
  }

  @SubscribeMessage(USER_SOCKET_EVENTS.CHAT_MESSAGE)
  async onChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const userId = this.requireUserId(client);
    const body = payload as { chatId?: unknown; content?: unknown };
    const chatId = requireSocketString(body?.chatId, 'chatId');
    const content = requireSocketString(body?.content, 'content');

    if (content.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new WsException('Message is too long');
    }

    await this.assertParticipant(userId, chatId);

    const message = await this.userService.createChatMessage(userId, chatId, content);
    await this.userService.setTypingStatus(userId, false);

    this.server.to(this.getChatRoom(chatId)).emit(USER_SOCKET_EVENTS.CHAT_MESSAGE, message);
    this.server.to(this.getChatRoom(chatId)).emit(USER_SOCKET_EVENTS.CHAT_TYPING, {
      chatId,
      userId,
      isTyping: false,
    });

    const participantIds = await this.userService.getChatParticipantUserIds(chatId);
    const inboxPayload = { chatId };
    for (const participantId of participantIds) {
      this.server.to(this.getUserRoom(participantId)).emit(USER_SOCKET_EVENTS.CHAT_INBOX_UPDATED, inboxPayload);
      this.emitNavigationBadgesForUser(participantId);
    }

    this.server.emit(USER_SOCKET_EVENTS.PRESENCE_UPDATED, {
      userId,
      isOnline: true,
      isTyping: false,
    });
  }

  @SubscribeMessage(USER_SOCKET_EVENTS.CHAT_READ)
  async onChatRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const userId = this.requireUserId(client);
    const chatId = requireSocketString((payload as { chatId?: unknown })?.chatId, 'chatId');

    await this.assertParticipant(userId, chatId);
    const readMessageIds = await this.userService.markChatAsRead(userId, chatId);

    const readPayload = {
      chatId,
      readByUserId: userId,
      messageIds: readMessageIds,
    };
    const readParticipantIds = await this.userService.getChatParticipantUserIds(chatId);
    for (const participantId of readParticipantIds) {
      this.server.to(this.getUserRoom(participantId)).emit(USER_SOCKET_EVENTS.CHAT_READ, readPayload);
      this.emitNavigationBadgesForUser(participantId);
    }
  }

  /** Push current badge counts to a user’s personal room (HTTP handlers may call after mutation). */
  emitNavigationBadgesForUser(userId: string): void {
    void this.userService.getNavigationBadges(userId).then((badges) => {
      this.server.to(this.getUserRoom(userId)).emit(USER_SOCKET_EVENTS.NAV_BADGES_UPDATED, badges);
    });
  }

  private async assertParticipant(userId: string, chatId: string): Promise<void> {
    try {
      await this.userService.assertChatRoomAccess(userId, chatId);
    } catch (err: unknown) {
      if (err instanceof ForbiddenException) {
        throw new WsException(err.message);
      }
      if (err instanceof NotFoundException) {
        throw new WsException('You are not a participant in this chat');
      }
      throw err;
    }
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
      return authHeader.replace(/^Bearer\s+/i, '').trim();
    }

    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    return null;
  }

  private requireUserId(client: AuthenticatedSocket): string {
    const userId = client.data.userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }
    return userId;
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private getChatRoom(chatId: string): string {
    return `chat:${chatId}`;
  }

  /** Call after HTTP edit: thread clients + inbox list refresh for all participants. */
  notifyMessageEdited(chatId: string, message: object): void {
    this.server.to(this.getChatRoom(chatId)).emit(USER_SOCKET_EVENTS.CHAT_MESSAGE_UPDATED, message);
    void this.userService.getChatParticipantUserIds(chatId).then((participantIds) => {
      for (const participantId of participantIds) {
        this.server.to(this.getUserRoom(participantId)).emit(USER_SOCKET_EVENTS.CHAT_INBOX_UPDATED, { chatId });
      }
    });
  }
}
