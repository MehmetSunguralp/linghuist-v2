import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { POST_CONTENT_MAX_LENGTH } from '../user.constants';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(POST_CONTENT_MAX_LENGTH)
  content?: string;

  /** Omit to leave unchanged; send empty string to remove image. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;
}
