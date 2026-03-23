import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import sharp from 'sharp';
import { PROFILE_PICTURE_MAX_BYTES, USER_THUMBNAIL_MAX_BYTES } from '../modules/user/user.constants';

export async function generateProfileWebp(inputBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(inputBuffer).metadata();
  const baseWidth = metadata.width ?? 1200;
  const resizeAttempts = [baseWidth, 1400, 1200, 1024, 900, 768]
    .filter((size, index, arr) => Number.isFinite(size) && size > 0 && arr.indexOf(size) === index)
    .sort((a, b) => b - a);

  for (const maxWidth of resizeAttempts) {
    const candidate = await createProfileUnderLimit(inputBuffer, maxWidth);
    if (candidate) {
      return candidate;
    }
  }

  throw new BadRequestException('Unable to compress this image under 250KB. Please upload a less detailed image.');
}

export async function generateThumbnailWebp(inputBuffer: Buffer): Promise<Buffer> {
  const resizeAttempts = [64, 60, 56, 52, 48];
  for (const size of resizeAttempts) {
    const candidate = await createThumbnailUnderLimit(inputBuffer, size);
    if (candidate) {
      return candidate;
    }
  }
  throw new InternalServerErrorException('Unable to generate thumbnail within 1KB');
}

async function createProfileUnderLimit(inputBuffer: Buffer, maxWidth: number): Promise<Buffer | null> {
  let minQuality = 35;
  let maxQuality = 90;
  let best: Buffer | null = null;

  while (minQuality <= maxQuality) {
    const quality = Math.floor((minQuality + maxQuality) / 2);
    const output = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({
        quality,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();

    if (output.length <= PROFILE_PICTURE_MAX_BYTES) {
      best = output;
      minQuality = quality + 1;
    } else {
      maxQuality = quality - 1;
    }
  }

  return best;
}

async function createThumbnailUnderLimit(inputBuffer: Buffer, size: number): Promise<Buffer | null> {
  let minQuality = 1;
  let maxQuality = 85;
  let best: Buffer | null = null;

  while (minQuality <= maxQuality) {
    const quality = Math.floor((minQuality + maxQuality) / 2);
    const output = await sharp(inputBuffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
        kernel: sharp.kernel.lanczos3,
      })
      .webp({
        quality,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();

    if (output.length <= USER_THUMBNAIL_MAX_BYTES) {
      best = output;
      minQuality = quality + 1;
    } else {
      maxQuality = quality - 1;
    }
  }

  return best;
}
