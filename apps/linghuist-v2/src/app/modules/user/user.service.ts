import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@linghuist-v2/prisma';
import { SupabaseService } from '@linghuist-v2/supabase';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import { generateProfileWebp, generateThumbnailWebp } from '../../util/image-upload.util';
import { parseCommaSeparatedLanguageCodes, normalizeLanguageCodes } from '../../util/language-code.util';
import {
  AVATAR_UPLOAD_MAX_BYTES,
  PROFILE_PICTURES_BUCKET,
  USERS_PAGE_SIZE,
  USER_THUMBNAIL_MAX_BYTES,
  USER_THUMBNAILS_BUCKET,
} from './user.constants';
import { MeUserResponseEnvelopeDto } from './dto/me_user_response.dto';
import { UpdateMeDto } from './dto/update_me.dto';
import { GetUserByUsernameResponseEnvelopeDto } from './dto/get_user_by_username_response.dto';
import { GetAllUsersResponseEnvelopeDto } from './dto/get_all_users_response.dto';
import { listUsersSelect, meUserSelect, profileByUsernameSelect } from './user.selects';

type GetAllUsersFilters = {
  known?: string;
  learning?: string;
};

type UploadedImageFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getMe(userId: string): Promise<MeUserResponseEnvelopeDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: meUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }

  async getAllUsers(
    userId: string,
    page: number,
    filters?: GetAllUsersFilters,
  ): Promise<GetAllUsersResponseEnvelopeDto> {
    if (!Number.isFinite(page) || page < 1 || !Number.isInteger(page)) {
      throw new BadRequestException('Page must be a positive integer');
    }

    const knownCodes = parseCommaSeparatedLanguageCodes(filters?.known);
    const learningCodes = parseCommaSeparatedLanguageCodes(filters?.learning);

    const where: Prisma.UserWhereInput = {
      AND: [
        { id: { not: userId } },
        // Only users who finished onboarding with a non-empty username
        { username: { not: null } },
        { NOT: { username: { equals: '' } } },
        ...(knownCodes?.length ? [{ languagesKnown: { hasSome: knownCodes } }] : []),
        ...(learningCodes?.length ? [{ languagesLearning: { hasSome: learningCodes } }] : []),
      ],
    };

    const [total, rows] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        select: listUsersSelect,
        orderBy: [{ lastOnline: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
        skip: (page - 1) * USERS_PAGE_SIZE,
        take: USERS_PAGE_SIZE,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

    return {
      message: 'Users retrieved successfully',
      data: {
        users: rows,
        page,
        pageSize: USERS_PAGE_SIZE,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getUserByUsername(username: string): Promise<GetUserByUsernameResponseEnvelopeDto> {
    const user = await this.prismaService.user.findUnique({
      where: { username: username },
      select: profileByUsernameSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }

  async updateMe(userId: string, updateMeDto: UpdateMeDto): Promise<MeUserResponseEnvelopeDto> {
    const data = Object.fromEntries(Object.entries(updateMeDto).filter(([, v]) => v !== undefined)) as UpdateMeDto;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    if (data.languagesKnown) {
      data.languagesKnown = normalizeLanguageCodes(data.languagesKnown);
    }
    if (data.languagesLearning) {
      data.languagesLearning = normalizeLanguageCodes(data.languagesLearning);
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

  async uploadMeAvatar(userId: string, file?: UploadedImageFile): Promise<MeUserResponseEnvelopeDto> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    if (file.size > AVATAR_UPLOAD_MAX_BYTES) {
      throw new BadRequestException('Source image must be 5MB or smaller');
    }

    const existing = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarUrl: true, thumbnailUrl: true },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const profileBuffer = await generateProfileWebp(file.buffer);

    const thumbnailBuffer = await generateThumbnailWebp(profileBuffer);
    if (thumbnailBuffer.length > USER_THUMBNAIL_MAX_BYTES) {
      throw new InternalServerErrorException('Failed to generate thumbnail within 1KB limit');
    }

    const fileKeyBase = `${userId}/${Date.now()}`;
    const profilePath = `${fileKeyBase}-profile.webp`;
    const thumbnailPath = `${fileKeyBase}-thumbnail.webp`;

    const supabase = this.supabaseService.getClient();
    const { error: profileUploadError } = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(profilePath, profileBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false,
      });

    if (profileUploadError) {
      this.logger.error({
        context: 'UserService.uploadMeAvatar',
        message: 'Failed to upload profile picture',
        userId,
        error: profileUploadError.message,
      });
      throw new InternalServerErrorException('Failed to upload profile picture');
    }

    const { error: thumbnailUploadError } = await supabase.storage
      .from(USER_THUMBNAILS_BUCKET)
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false,
      });

    if (thumbnailUploadError) {
      await supabase.storage.from(PROFILE_PICTURES_BUCKET).remove([profilePath]);
      this.logger.error({
        context: 'UserService.uploadMeAvatar',
        message: 'Failed to upload thumbnail',
        userId,
        error: thumbnailUploadError.message,
      });
      throw new InternalServerErrorException('Failed to upload thumbnail');
    }

    const avatarUrl = `${PROFILE_PICTURES_BUCKET}/${profilePath}`;
    const thumbnailUrl = `${USER_THUMBNAILS_BUCKET}/${thumbnailPath}`;

    try {
      const updated = await this.prismaService.user.update({
        where: { id: userId },
        data: { avatarUrl, thumbnailUrl },
        select: meUserSelect,
      });

      await this.removeStorageFileFromUrl(existing.avatarUrl, PROFILE_PICTURES_BUCKET);
      await this.removeStorageFileFromUrl(existing.thumbnailUrl, USER_THUMBNAILS_BUCKET);

      return {
        message: 'Avatar uploaded successfully',
        data: updated,
      };
    } catch (error) {
      await supabase.storage.from(PROFILE_PICTURES_BUCKET).remove([profilePath]);
      await supabase.storage.from(USER_THUMBNAILS_BUCKET).remove([thumbnailPath]);
      throw error;
    }
  }

  /**
   * Verifies password via Supabase, deletes the DB row (cascades), then removes the auth user.
   */
  async deleteMe(userId: string, password: string): Promise<ApiEnvelope<null>> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const supabase = this.supabaseService.getClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signInError) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.prismaService.user.delete({
      where: { id: userId },
    });

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      this.logger.error({
        context: 'UserService.deleteMe',
        message: 'Supabase auth user deletion failed after DB delete',
        userId,
        error: error.message,
      });
      throw new InternalServerErrorException('Account data was removed but sign-in cleanup failed. Contact support.');
    }

    return {
      message: 'Account deleted successfully',
      data: null,
    };
  }

  private getStoragePathFromUrl(url: string | null | undefined, bucket: string): string | null {
    if (!url) return null;
    if (!url.startsWith(`${bucket}/`)) return null;
    return url.slice(bucket.length + 1) || null;
  }

  private async removeStorageFileFromUrl(url: string | null | undefined, bucket: string): Promise<void> {
    const path = this.getStoragePathFromUrl(url, bucket);
    if (!path) return;

    const { error } = await this.supabaseService.getClient().storage.from(bucket).remove([path]);
    if (error) {
      this.logger.warn({
        context: 'UserService.removeStorageFileFromUrl',
        message: 'Failed to remove previous storage file',
        bucket,
        path,
        error: error.message,
      });
    }
  }
}
