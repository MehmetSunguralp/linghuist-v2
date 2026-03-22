import { Body, Controller, Post } from '@nestjs/common';
import type { ApiEnvelope, LoginSessionData } from '../../common/api-envelope.types';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request_password_reset.dto';
import { UpdatePasswordDto } from './dto/update_password.dto';

/** Public auth routes; responses follow `{ message, data }` (data may be null). */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<ApiEnvelope<null>> {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<ApiEnvelope<LoginSessionData>> {
    return this.authService.login(dto);
  }

  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<ApiEnvelope<null>> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('update-password')
  updatePassword(@Body() dto: UpdatePasswordDto): Promise<ApiEnvelope<null>> {
    return this.authService.updatePassword(dto);
  }
}
