import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@linghuist-v2/prisma';
import { SupabaseService } from '@linghuist-v2/supabase';
import type { ApiEnvelope, LoginSessionData } from '../../common/api-envelope.types';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request_password_reset.dto';
import { UpdatePasswordDto } from './dto/update_password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  /** Registers a user in auth provider and mirrors minimal profile row in app DB. */
  async signup(dto: SignupDto): Promise<ApiEnvelope<null>> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        emailRedirectTo: process.env.CLIENT_URL + '/confirm-email',
      },
    });

    if (error) {
      this.logger.error({
        context: 'AuthService.signup',
        event: 'signupFailed',
        message: error.message,
        email: dto.email,
      });
      throw new BadRequestException('Signup failed');
    }

    if (!data.user) {
      throw new BadRequestException('User creation failed');
    }
    if (!data.user.email) {
      this.logger.error({
        context: 'AuthService.signup',
        event: 'signupMissingEmail',
        message: 'Supabase returned user without email',
      });
      throw new BadRequestException('Signup failed');
    }

    await this.prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    return {
      message: `Confirmation email sent to ${dto.email}`,
      data: null,
    };
  }

  /** Authenticates with password and returns access/refresh tokens. */
  async login(dto: LoginDto): Promise<ApiEnvelope<LoginSessionData>> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      this.logger.warn({
        context: 'AuthService.login',
        event: 'loginFailed',
        message: error.message,
        email: dto.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!data.session) {
      throw new UnauthorizedException('Login failed');
    }

    return {
      message: 'Login successful',
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    };
  }

  /** Sends password reset email and always returns generic success for privacy. */
  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<ApiEnvelope<null>> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo: process.env.CLIENT_URL + '/reset-password',
    });

    if (error) {
      this.logger.error({
        context: 'AuthService.requestPasswordReset',
        event: 'passwordResetRequestFailed',
        message: error.message,
        email: dto.email,
      });
    }

    return {
      message: 'If this email exists, a reset link has been sent',
      data: null,
    };
  }

  /** Validates recovery session and updates user password. */
  async updatePassword(dto: UpdatePasswordDto): Promise<ApiEnvelope<null>> {
    const supabase = this.supabaseService.getClient();

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: dto.accessToken,
      refresh_token: dto.refreshToken,
    });

    if (sessionError) {
      this.logger.warn({
        context: 'AuthService.updatePassword',
        event: 'setSessionFailed',
        message: sessionError.message,
      });
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { error } = await supabase.auth.updateUser({
      password: dto.newPassword,
    });

    if (error) {
      this.logger.error({
        context: 'AuthService.updatePassword',
        event: 'passwordUpdateFailed',
        message: error.message,
      });
      throw new BadRequestException('Password update failed');
    }

    return {
      message: 'Password updated successfully',
      data: null,
    };
  }
}
