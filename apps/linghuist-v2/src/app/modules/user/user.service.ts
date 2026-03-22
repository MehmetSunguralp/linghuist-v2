import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@linghuist-v2/prisma';
import { MeUserResponseDto } from './dto/me_user_response.dto';
import { UpdateMeDto } from './dto/update_me.dto';

const meUserSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatarUrl: true,
  nativeLanguage: true,
  learningLanguage: true,
  level: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMe(userId: string): Promise<MeUserResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: meUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { id, email, username, name, avatarUrl, nativeLanguage, learningLanguage, level } = user;

    return {
      id,
      email,
      username,
      name,
      avatarUrl,
      nativeLanguage,
      learningLanguage,
      level,
    };
  }

  async updateMe(userId: string, updateMeDto: UpdateMeDto): Promise<MeUserResponseDto> {
    const data = Object.fromEntries(
      Object.entries(updateMeDto).filter(([, v]) => v !== undefined),
    ) as UpdateMeDto;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const existing = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prismaService.user.update({
      where: { id: userId },
      data,
      select: meUserSelect,
    });
  }
}
