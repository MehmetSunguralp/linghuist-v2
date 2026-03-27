import {
  Body,
  Controller,
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

type UploadedImageFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

/** Authenticated profile and discovery routes; all JSON success bodies use `{ message, data }`. */
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  markNotificationAsRead(
    @CurrentUserId() userId: string,
    @Param('notificationId') notificationId: string,
  ): Promise<ApiEnvelope<null>> {
    return this.userService.markNotificationAsRead(userId, notificationId);
  }

  @UseGuards(AuthGuard)
  @Get('chats/list')
  getMyChats(@CurrentUserId() userId: string): Promise<GetUserChatsResponseEnvelopeDto> {
    return this.userService.getMyChats(userId);
  }

  @UseGuards(AuthGuard)
  @Get('chats/:chatId/messages')
  getChatMessages(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
  ): Promise<GetChatMessagesResponseEnvelopeDto> {
    return this.userService.getChatMessages(userId, chatId);
  }

  @UseGuards(AuthGuard)
  @Get(':username')
  getUserByUsername(@Param('username') username: string): Promise<GetUserByUsernameResponseEnvelopeDto> {
    return this.userService.getUserByUsername(username);
  }
}
