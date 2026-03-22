import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '@linghuist-v2/prisma';
import { SupabaseService } from '@linghuist-v2/supabase';
import { RequestPasswordResetDto } from './dto/request_password_reset.dto';
import { UpdatePasswordDto } from './dto/update_password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  /////
  // SIGNUP
  ////
  async signup(dto: SignupDto) {
    // 1. password check
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const supabase = this.supabaseService.getClient();

    // 2. supabase signup
    const { data, error } = await supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        emailRedirectTo: process.env.CLIENT_URL + '/confirm-email',
      },
    });

    if (error) {
      console.error({
        context: 'AuthService.signup',
        message: 'Signup error',
        error: error.message,
        email: dto.email,
      });
      throw new BadRequestException('Signup failed');
    }

    if (!data.user) {
      throw new BadRequestException('User creation failed');
    }

    // 3. prisma user upsert
    await this.prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: dto.email,
      },
    });

    return {
      message: `Confirmation email sent to ${dto.email}`,
      data: null,
    };
  }

  /////
  // LOGIN
  ////
  //TODO: Add rate limit protection
  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      console.error({
        context: 'AuthService.login',
        message: 'Login error.',
        error: error.message,
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

  /////
  // REQUEST PASSWORD RESET
  ////
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.auth.resetPasswordForEmail(dto.email, {
      redirectTo: process.env.CLIENT_URL + '/reset-password',
    });

    if (error) {
      console.error({
        context: 'AuthService.requestPasswordReset',
        message: 'Password reset error.',
        error: error.message,
        email: dto.email,
      });
    }

    return {
      message: 'If this email exists, a reset link has been sent',
      data: null,
    };
  }

  /////
  // UPDATE PASSWORD
  ////
  async updatePassword(dto: UpdatePasswordDto) {
    const supabase = this.supabaseService.getClient();

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: dto.accessToken,
      refresh_token: dto.accessToken,
    });

    if (sessionError) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { error } = await supabase.auth.updateUser({
      password: dto.newPassword,
    });

    if (error) {
      console.error({
        context: 'AuthService.updatePassword',
        message: 'Password update error.',
        error: error.message,
      });
      throw new BadRequestException('Password update failed');
    }

    return {
      message: 'Password updated successfully',
      data: null,
    };
  }
}
