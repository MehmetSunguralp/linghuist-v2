import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './user.controller';
import { UserGateway } from './user.gateway';
import { UserChatService } from './user-chat.service';
import { UserFriendService } from './user-friend.service';
import { UserNotificationService } from './user-notification.service';
import { UserProfileService } from './user-profile.service';
import { UserService } from './user.service';

/** User profile & discovery; imports `AuthModule` for `AuthGuard`. */
@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserProfileService,
    UserFriendService,
    UserChatService,
    UserNotificationService,
    UserGateway,
  ],
})
export class UserModule {}
