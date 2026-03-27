import { Injectable } from '@nestjs/common';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { GetAllUsersResponseEnvelopeDto } from './dto/get_all_users_response.dto';
import { GetChatMessagesResponseEnvelopeDto } from './dto/get_chat_messages_response.dto';
import { GetUserByUsernameResponseEnvelopeDto } from './dto/get_user_by_username_response.dto';
import { GetUserChatsResponseEnvelopeDto } from './dto/get_user_chats_response.dto';
import { GetUserNotificationsResponseEnvelopeDto } from './dto/get_user_notifications_response.dto';
import { MeUserResponseEnvelopeDto } from './dto/me_user_response.dto';
import { UpdateMeDto } from './dto/update_me.dto';
import type { GetAllUsersFilters, UploadedImageFile } from './types/user.types';
import { FriendRequestsListEnvelopeDto } from './dto/friend_requests_response.dto';
import { UserChatService } from './user-chat.service';
import { UserFriendService } from './user-friend.service';
import { UserNotificationService } from './user-notification.service';
import { UserProfileService } from './user-profile.service';
import { USER_NOTIFICATIONS_DEFAULT_PAGE_SIZE } from './user.constants';

@Injectable()
export class UserService {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userFriendService: UserFriendService,
    private readonly userChatService: UserChatService,
    private readonly userNotificationService: UserNotificationService,
  ) {}

  /** Facade method for reading the current authenticated user profile. */
  async getMe(userId: string): Promise<MeUserResponseEnvelopeDto> {
    return this.userProfileService.getMe(userId);
  }

  /** Facade method for discovery list with optional language filters. */
  async getAllUsers(
    userId: string,
    page: number,
    filters?: GetAllUsersFilters,
  ): Promise<GetAllUsersResponseEnvelopeDto> {
    return this.userProfileService.getAllUsers(userId, page, filters);
  }

  /** Facade method for fetching a public profile by username. */
  async getUserByUsername(username: string): Promise<GetUserByUsernameResponseEnvelopeDto> {
    return this.userProfileService.getUserByUsername(username);
  }

  /** Facade method for updating editable fields on current user. */
  async updateMe(userId: string, updateMeDto: UpdateMeDto): Promise<MeUserResponseEnvelopeDto> {
    return this.userProfileService.updateMe(userId, updateMeDto);
  }

  /** Facade method for avatar upload pipeline and thumbnail generation. */
  async uploadMeAvatar(userId: string, file?: UploadedImageFile): Promise<MeUserResponseEnvelopeDto> {
    return this.userProfileService.uploadMeAvatar(userId, file);
  }

  /** Facade method for account deletion with password confirmation. */
  async deleteMe(userId: string, password: string): Promise<ApiEnvelope<null>> {
    return this.userProfileService.deleteMe(userId, password);
  }

  /** Facade method for presence online/offline updates. */
  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    return this.userChatService.setOnlineStatus(userId, isOnline);
  }

  /** Facade method for typing indicator status updates. */
  async setTypingStatus(userId: string, isTyping: boolean): Promise<void> {
    return this.userChatService.setTypingStatus(userId, isTyping);
  }

  /** Facade method for validating chat membership. */
  async isChatParticipant(userId: string, chatId: string): Promise<boolean> {
    return this.userChatService.isChatParticipant(userId, chatId);
  }

  /** Facade: membership plus block/friend rules for chat rooms. */
  async assertChatRoomAccess(userId: string, chatId: string): Promise<void> {
    return this.userChatService.assertChatRoomAccess(userId, chatId);
  }

  /** Facade: participant user IDs for socket fan-out to personal rooms. */
  async getChatParticipantUserIds(chatId: string): Promise<string[]> {
    return this.userChatService.getChatParticipantUserIds(chatId);
  }

  /** Facade method for persisting new chat messages. */
  async createChatMessage(userId: string, chatId: string, content: string) {
    return this.userChatService.createChatMessage(userId, chatId, content);
  }

  /** Facade method for marking unread incoming chat messages as read. */
  async markChatAsRead(userId: string, chatId: string): Promise<string[]> {
    return this.userChatService.markChatAsRead(userId, chatId);
  }

  /** Facade method for manual message correction. */
  async manuallyCorrectMessage(
    userId: string,
    messageId: string,
    correctedText: string,
  ) {
    return this.userChatService.manuallyCorrectMessage(userId, messageId, correctedText);
  }

  /** Facade method for AI-based message translation. */
  async translateMessageWithAi(
    userId: string,
    messageId: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<ApiEnvelope<{ messageId: string; translatedText: string }>> {
    return this.userChatService.translateMessageWithAi(userId, messageId, targetLanguage, sourceLanguage);
  }

  /** Facade method for AI next-message suggestion. */
  async suggestNextMessage(
    userId: string,
    chatId: string,
    userLanguage: string,
    chatLanguage?: string,
  ): Promise<ApiEnvelope<{ suggestion: string; translatedSuggestion: string }>> {
    return this.userChatService.suggestNextMessage(userId, chatId, userLanguage, chatLanguage);
  }

  /** Facade: edit own message and clear AI translation cache. */
  async editOwnMessage(userId: string, messageId: string, newContent: string) {
    return this.userChatService.editOwnMessage(userId, messageId, newContent);
  }

  /** Facade method for listing chats with interlocutor metadata. */
  async getMyChats(userId: string): Promise<GetUserChatsResponseEnvelopeDto> {
    return this.userChatService.getMyChats(userId);
  }

  /** Facade: find or create a DM with an accepted friend. */
  async ensureDirectChatWithUser(userId: string, otherUserId: string) {
    return this.userChatService.ensureDirectChatWithUser(userId, otherUserId);
  }

  /** Facade method for loading message history of a chat. */
  async getChatMessages(userId: string, chatId: string): Promise<GetChatMessagesResponseEnvelopeDto> {
    return this.userChatService.getChatMessages(userId, chatId);
  }

  /** Facade method for paginated notifications query. */
  async getMyNotifications(
    userId: string,
    page: number,
    pageSize = USER_NOTIFICATIONS_DEFAULT_PAGE_SIZE,
  ): Promise<GetUserNotificationsResponseEnvelopeDto> {
    const chatUnreadThreadCount = await this.userChatService.getUnreadChatThreadCount(userId);
    return this.userNotificationService.getMyNotifications(userId, page, pageSize, chatUnreadThreadCount);
  }

  /** Unread chat threads vs social notification bell (excludes CHAT_MESSAGE rows). */
  async getNavigationBadges(userId: string): Promise<{ unreadChatThreads: number; socialUnreadCount: number }> {
    const [unreadChatThreads, socialUnreadCount] = await Promise.all([
      this.userChatService.getUnreadChatThreadCount(userId),
      this.userNotificationService.getSocialUnreadCount(userId),
    ]);
    return { unreadChatThreads, socialUnreadCount };
  }

  /** Facade method for marking a notification as read. */
  async markNotificationAsRead(userId: string, notificationId: string): Promise<ApiEnvelope<null>> {
    return this.userNotificationService.markNotificationAsRead(userId, notificationId);
  }

  sendFriendRequest(userId: string, receiverId: string): Promise<ApiEnvelope<{ requestId: string }>> {
    return this.userFriendService.sendFriendRequest(userId, receiverId);
  }

  listIncomingFriendRequests(userId: string): Promise<FriendRequestsListEnvelopeDto> {
    return this.userFriendService.listIncomingFriendRequests(userId);
  }

  listOutgoingFriendRequests(userId: string): Promise<FriendRequestsListEnvelopeDto> {
    return this.userFriendService.listOutgoingFriendRequests(userId);
  }

  acceptFriendRequest(userId: string, requestId: string) {
    return this.userFriendService.acceptFriendRequest(userId, requestId);
  }

  rejectFriendRequest(userId: string, requestId: string): Promise<ApiEnvelope<{ requestId: string }>> {
    return this.userFriendService.rejectFriendRequest(userId, requestId);
  }
}
