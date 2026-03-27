import { IsString, MinLength } from 'class-validator';

export class OpenDirectChatDto {
  /** Other participant’s user id (same as `User.id` / auth subject). */
  @IsString()
  @MinLength(1)
  otherUserId!: string;
}
