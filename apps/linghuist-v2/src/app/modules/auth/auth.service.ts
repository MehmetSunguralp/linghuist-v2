import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '@linghuist-v2/prisma';
import { SupabaseService } from '@linghuist-v2/supabase';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

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
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // 3. prisma user create
    const user = await this.prisma.user.create({
      data: {
        id: data.user?.id,
        email: dto.email,
      },
    });

    return {
      user,
      session: data.session,
    };
  }

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      session: data.session,
      user: data.user,
    };
  }
}
