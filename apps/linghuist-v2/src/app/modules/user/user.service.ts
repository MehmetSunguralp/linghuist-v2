import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@linghuist-v2/prisma';
import { MeUserResponseEnvelopeDto } from './dto/me_user_response.dto';
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
  bio: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMe(userId: string): Promise<MeUserResponseEnvelopeDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: meUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { id, email, username, name, avatarUrl, nativeLanguage, learningLanguage, level, bio } = user;

    return {
      message: 'User retrieved successfully',
      data: {
        id,
        email,
        username,
        name,
        avatarUrl,
        nativeLanguage,
        learningLanguage,
        level,
        bio,
      },
    };
  }

  async updateMe(userId: string, updateMeDto: UpdateMeDto): Promise<MeUserResponseEnvelopeDto> {
    const data = Object.fromEntries(Object.entries(updateMeDto).filter(([, v]) => v !== undefined)) as UpdateMeDto;

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

    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data,
      select: meUserSelect,
    });

    return {
      message: 'User updated successfully',
      data: updated,
    };
  }
}
