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
        message: error.message,
        email: dto.email,
      });
      throw new BadRequestException('Signup failed');
    }

    if (!data.user) {
      throw new BadRequestException('User creation failed');
    }

    await this.prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email!,
      },
    });

    return {
      message: `Confirmation email sent to ${dto.email}`,
      data: null,
    };
  }

  /** Consider rate limiting by IP + email for production hardening. */
  async login(dto: LoginDto): Promise<ApiEnvelope<LoginSessionData>> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      this.logger.warn({
        context: 'AuthService.login',
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

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<ApiEnvelope<null>> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo: process.env.CLIENT_URL + '/reset-password',
    });

    if (error) {
      this.logger.error({
        context: 'AuthService.requestPasswordReset',
        message: error.message,
        email: dto.email,
      });
    }

    return {
      message: 'If this email exists, a reset link has been sent',
      data: null,
    };
  }

  async updatePassword(dto: UpdatePasswordDto): Promise<ApiEnvelope<null>> {
    const supabase = this.supabaseService.getClient();

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: dto.accessToken,
      refresh_token: dto.refreshToken,
    });

    if (sessionError) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { error } = await supabase.auth.updateUser({
      password: dto.newPassword,
    });

    if (error) {
      this.logger.error({
        context: 'AuthService.updatePassword',
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
