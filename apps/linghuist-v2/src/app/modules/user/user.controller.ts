import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { MeUserResponseEnvelopeDto } from './dto/me_user_response.dto';
import { UpdateMeDto } from './dto/update_me.dto';
import { DeleteMeDto } from './dto/delete_me.dto';
import { UserService } from './user.service';
import { GetUserByUsernameResponseEnvelopeDto } from './dto/get_user_by_username_response.dto';
import { GetAllUsersResponseEnvelopeDto } from './dto/get_all_users_response.dto';

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

  /** POST so clients can reliably send JSON body (password). */
  @UseGuards(AuthGuard)
  @Post('me/delete')
  deleteMe(@CurrentUserId() userId: string, @Body() body: DeleteMeDto): Promise<ApiEnvelope<null>> {
    return this.userService.deleteMe(userId, body.password);
  }

  @UseGuards(AuthGuard)
  @Get(':username')
  getUserByUsername(@Param('username') username: string): Promise<GetUserByUsernameResponseEnvelopeDto> {
    return this.userService.getUserByUsername(username);
  }
}
