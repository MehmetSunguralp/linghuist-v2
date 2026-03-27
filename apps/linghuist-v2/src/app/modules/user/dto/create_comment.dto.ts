import { IsString, MaxLength, MinLength } from 'class-validator';
import { COMMENT_CONTENT_MAX_LENGTH } from '../user.constants';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(COMMENT_CONTENT_MAX_LENGTH)
  content!: string;
}
