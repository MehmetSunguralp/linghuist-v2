import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { POST_CONTENT_MAX_LENGTH } from '../user.constants';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(POST_CONTENT_MAX_LENGTH)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;
}
