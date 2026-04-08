import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { MeUserResponseEnvelopeDto } from './dto/me_user_response.dto';
import { UpdateMeDto } from './dto/update_me.dto';
import { DeleteMeDto } from './dto/delete_me.dto';
import { UserService } from './user.service';
import { GetUserByUsernameResponseEnvelopeDto } from './dto/get_user_by_username_response.dto';
import { GetAllUsersResponseEnvelopeDto } from './dto/get_all_users_response.dto';
import { AVATAR_UPLOAD_MAX_BYTES } from './user.constants';
import { UserNotificationsQueryDto } from './dto/user_notifications_query.dto';
import { GetUserNotificationsResponseEnvelopeDto } from './dto/get_user_notifications_response.dto';
import { GetUserChatsResponseEnvelopeDto } from './dto/get_user_chats_response.dto';
import { GetChatMessagesResponseEnvelopeDto } from './dto/get_chat_messages_response.dto';
import { CorrectMessageDto } from './dto/correct_message.dto';
import { TranslateMessageDto } from './dto/translate_message.dto';
import { ChatSuggestionDto } from './dto/chat_suggestion.dto';
import { OpenDirectChatDto } from './dto/open_direct_chat.dto';
import { EditMessageDto } from './dto/edit_message.dto';
import { CreateChatMessageDto } from './dto/create_chat_message.dto';
import { BlockUserDto } from './dto/block_user.dto';
import { RemoveFriendDto } from './dto/remove_friend.dto';
import { SendFriendRequestDto } from './dto/send_friend_request.dto';
import { FriendRequestsListEnvelopeDto, FriendsListEnvelopeDto } from './dto/friend_requests_response.dto';
import { CreatePostDto } from './dto/create_post.dto';
import { UpdatePostDto } from './dto/update_post.dto';
import { CreateCommentDto } from './dto/create_comment.dto';
import { FeedQueryDto } from './dto/feed_query.dto';
import { UserGateway } from './user.gateway';

type UploadedImageFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

/** Authenticated profile and discovery routes; all JSON success bodies use `{ message, data }`. */
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userGateway: UserGateway,
  ) {}

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@CurrentUserId() userId: string): Promise<MeUserResponseEnvelopeDto> {
    return this.userService.getMe(userId);
  }

  @UseGuards(AuthGuard)
  @Get('all/:page')
  getAllUsers(
    @CurrentUserId() userId: string,
    @Param('page', ParseIntPipe) page: number,
    @Query('known') known?: string,
    @Query('learning') learning?: string,
  ): Promise<GetAllUsersResponseEnvelopeDto> {
    return this.userService.getAllUsers(userId, page, { known, learning });
  }

  @UseGuards(AuthGuard)
  @Put('update-me')
  updateMe(@CurrentUserId() userId: string, @Body() updateMeDto: UpdateMeDto): Promise<MeUserResponseEnvelopeDto> {
    return this.userService.updateMe(userId, updateMeDto);
  }

  @UseGuards(AuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'avatar', maxCount: 1 },
      ],
      {
        limits: { fileSize: AVATAR_UPLOAD_MAX_BYTES },
      },
    ),
  )
  uploadMeAvatar(
    @CurrentUserId() userId: string,
    @UploadedFiles()
    files:
      | {
          file?: UploadedImageFile[];
          avatar?: UploadedImageFile[];
        }
      | undefined,
  ): Promise<MeUserResponseEnvelopeDto> {
    const file = files?.file?.[0] ?? files?.avatar?.[0];
    return this.userService.uploadMeAvatar(userId, file);
  }

  /** POST so clients can reliably send JSON body (password). */
  @UseGuards(AuthGuard)
  @Post('me/delete')
  deleteMe(@CurrentUserId() userId: string, @Body() body: DeleteMeDto): Promise<ApiEnvelope<null>> {
    return this.userService.deleteMe(userId, body.password);
  }

  @UseGuards(AuthGuard)
  @Get('notifications/list')
  getMyNotifications(
    @CurrentUserId() userId: string,
    @Query() query: UserNotificationsQueryDto,
  ): Promise<GetUserNotificationsResponseEnvelopeDto> {
    return this.userService.getMyNotifications(userId, query.page ?? 1, query.limit);
  }

  @UseGuards(AuthGuard)
  @Put('notifications/:notificationId/read')
  async markNotificationAsRead(
    @CurrentUserId() userId: string,
    @Param('notificationId') notificationId: string,
  ): Promise<ApiEnvelope<null>> {
    const result = await this.userService.markNotificationAsRead(userId, notificationId);
    this.userGateway.emitNavigationBadgesForUser(userId);
    return result;
  }

  @UseGuards(AuthGuard)
  @Get('chats/list')
  getMyChats(@CurrentUserId() userId: string): Promise<GetUserChatsResponseEnvelopeDto> {
    return this.userService.getMyChats(userId);
  }

  /** Find or create a 1:1 chat with another user (accepted friends, not blocked). */
  @UseGuards(AuthGuard)
  @Post('chats/open')
  openDirectChat(
    @CurrentUserId() userId: string,
    @Body() body: OpenDirectChatDto,
  ): Promise<ApiEnvelope<{ chatId: string }>> {
    return this.userService.ensureDirectChatWithUser(userId, body.otherUserId);
  }

  @UseGuards(AuthGuard)
  @Get('chats/:chatId/messages')
  getChatMessages(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Query('before') before?: string,
    @Query('take') take?: string,
  ): Promise<GetChatMessagesResponseEnvelopeDto> {
    return this.userService.getChatMessages(userId, chatId, before, take);
  }

  @UseGuards(AuthGuard)
  @Post('chats/:chatId/messages')
  async createChatMessage(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Body() body: CreateChatMessageDto,
  ): Promise<ApiEnvelope<{ chatId: string; message: unknown }>> {
    const message = await this.userService.createChatMessage(userId, chatId, body.content);
    return {
      message: 'Message sent successfully',
      data: { chatId, message },
    };
  }

  @UseGuards(AuthGuard)
  @Put('chats/messages/:messageId')
  async editOwnMessage(
    @CurrentUserId() userId: string,
    @Param('messageId') messageId: string,
    @Body() body: EditMessageDto,
  ) {
    const envelope = await this.userService.editOwnMessage(userId, messageId, body.content);
    this.userGateway.notifyMessageEdited(envelope.data.chatId, envelope.data.message);
    return envelope;
  }

  @UseGuards(AuthGuard)
  @Put('chats/messages/:messageId/correct')
  async manuallyCorrectMessage(
    @CurrentUserId() userId: string,
    @Param('messageId') messageId: string,
    @Body() body: CorrectMessageDto,
  ) {
    const envelope = await this.userService.manuallyCorrectMessage(userId, messageId, body.correctedText);
    this.userGateway.notifyMessageEdited(envelope.data.chatId, envelope.data.message);
    return envelope;
  }

  @UseGuards(AuthGuard)
  @Post('chats/messages/:messageId/translate')
  translateMessageWithAi(
    @CurrentUserId() userId: string,
    @Param('messageId') messageId: string,
    @Body() body: TranslateMessageDto,
  ): Promise<ApiEnvelope<{ messageId: string; translatedText: string }>> {
    return this.userService.translateMessageWithAi(userId, messageId, body.targetLanguage, body.sourceLanguage);
  }

  @UseGuards(AuthGuard)
  @Post('chats/:chatId/suggestion')
  suggestNextMessage(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Body() body: ChatSuggestionDto,
  ): Promise<ApiEnvelope<{ suggestion: string; translatedSuggestion: string }>> {
    return this.userService.suggestNextMessage(userId, chatId, body.userLanguage, body.chatLanguage);
  }

  @UseGuards(AuthGuard)
  @Post('friends/request')
  async sendFriendRequest(
    @CurrentUserId() userId: string,
    @Body() body: SendFriendRequestDto,
  ): Promise<ApiEnvelope<{ requestId: string }>> {
    const result = await this.userService.sendFriendRequest(userId, body.receiverId);
    this.userGateway.emitNavigationBadgesForUser(body.receiverId);
    this.userGateway.emitNavigationBadgesForUser(userId);
    return result;
  }

  @UseGuards(AuthGuard)
  @Get('friends/list')
  listFriends(@CurrentUserId() userId: string): Promise<FriendsListEnvelopeDto> {
    return this.userService.listFriends(userId);
  }

  @UseGuards(AuthGuard)
  @Get('friends/requests/incoming')
  listIncomingFriendRequests(@CurrentUserId() userId: string): Promise<FriendRequestsListEnvelopeDto> {
    return this.userService.listIncomingFriendRequests(userId);
  }

  @UseGuards(AuthGuard)
  @Get('friends/requests/outgoing')
  listOutgoingFriendRequests(@CurrentUserId() userId: string): Promise<FriendRequestsListEnvelopeDto> {
    return this.userService.listOutgoingFriendRequests(userId);
  }

  @UseGuards(AuthGuard)
  @Put('friends/requests/:requestId/accept')
  async acceptFriendRequest(
    @CurrentUserId() userId: string,
    @Param('requestId') requestId: string,
  ): Promise<ApiEnvelope<{ requestId: string; otherUserId: string }>> {
    const result = await this.userService.acceptFriendRequest(userId, requestId);
    this.userGateway.emitNavigationBadgesForUser(userId);
    this.userGateway.emitNavigationBadgesForUser(result.data.otherUserId);
    return result;
  }

  @UseGuards(AuthGuard)
  @Put('friends/requests/:requestId/reject')
  async rejectFriendRequest(
    @CurrentUserId() userId: string,
    @Param('requestId') requestId: string,
  ): Promise<ApiEnvelope<{ requestId: string }>> {
    const result = await this.userService.rejectFriendRequest(userId, requestId);
    this.userGateway.emitNavigationBadgesForUser(userId);
    return result;
  }

  @UseGuards(AuthGuard)
  @Post('friends/remove')
  removeFriend(@CurrentUserId() userId: string, @Body() body: RemoveFriendDto): Promise<ApiEnvelope<null>> {
    return this.userService.removeFriend(userId, body.otherUserId);
  }

  @UseGuards(AuthGuard)
  @Post('friends/block')
  blockUser(@CurrentUserId() userId: string, @Body() body: BlockUserDto): Promise<ApiEnvelope<null>> {
    return this.userService.blockUser(userId, body.blockedUserId);
  }

  @UseGuards(AuthGuard)
  @Get('posts/feed')
  getFeed(@CurrentUserId() userId: string, @Query() query: FeedQueryDto) {
    return this.userService.getFeed(userId, query.page ?? 1, query.limit);
  }

  @UseGuards(AuthGuard)
  @Post('posts')
  createPost(@CurrentUserId() userId: string, @Body() body: CreatePostDto) {
    return this.userService.createPost(userId, body);
  }

  @UseGuards(AuthGuard)
  @Get('posts/:postId')
  getPostById(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.userService.getPostById(userId, postId);
  }

  @UseGuards(AuthGuard)
  @Put('posts/:postId')
  updatePost(@CurrentUserId() userId: string, @Param('postId') postId: string, @Body() body: UpdatePostDto) {
    return this.userService.updatePost(userId, postId, body);
  }

  @UseGuards(AuthGuard)
  @Delete('posts/:postId')
  deletePost(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.userService.deletePost(userId, postId);
  }

  @UseGuards(AuthGuard)
  @Post('posts/:postId/like')
  async likePost(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    const envelope = await this.userService.likePost(userId, postId);
    if (envelope.data.postAuthorId !== userId) {
      this.userGateway.emitNavigationBadgesForUser(envelope.data.postAuthorId);
    }
    return envelope;
  }

  @UseGuards(AuthGuard)
  @Delete('posts/:postId/like')
  unlikePost(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.userService.unlikePost(userId, postId);
  }

  @UseGuards(AuthGuard)
  @Get('posts/:postId/comments')
  listPostComments(@CurrentUserId() userId: string, @Param('postId') postId: string, @Query() query: FeedQueryDto) {
    return this.userService.listPostComments(userId, postId, query.page ?? 1, query.limit);
  }

  @UseGuards(AuthGuard)
  @Post('posts/:postId/comments')
  async createPostComment(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
    @Body() body: CreateCommentDto,
  ) {
    const envelope = await this.userService.createPostComment(userId, postId, body);
    if (envelope.data.postAuthorId !== userId) {
      this.userGateway.emitNavigationBadgesForUser(envelope.data.postAuthorId);
    }
    return envelope;
  }

  @UseGuards(AuthGuard)
  @Delete('comments/:commentId')
  deletePostComment(@CurrentUserId() userId: string, @Param('commentId') commentId: string) {
    return this.userService.deletePostComment(userId, commentId);
  }

  @UseGuards(AuthGuard)
  @Get(':username')
  getUserByUsername(
    @CurrentUserId() viewerId: string,
    @Param('username') username: string,
  ): Promise<GetUserByUsernameResponseEnvelopeDto> {
    return this.userService.getUserByUsername(viewerId, username);
  }
}
