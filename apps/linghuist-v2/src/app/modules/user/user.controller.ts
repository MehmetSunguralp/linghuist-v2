import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { MeUserResponseDto } from './dto/me_user_response.dto';
import { UpdateMeDto } from './dto/update_me.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@CurrentUserId() userId: string): Promise<MeUserResponseDto> {
    return this.userService.getMe(userId);
  }

  @UseGuards(AuthGuard)
  @Put('update-me')
  updateMe(@CurrentUserId() userId: string, @Body() updateMeDto: UpdateMeDto): Promise<MeUserResponseDto> {
    return this.userService.updateMe(userId, updateMeDto);
  }
}
