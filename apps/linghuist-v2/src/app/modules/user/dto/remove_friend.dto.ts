import { IsString, MinLength } from 'class-validator';

export class RemoveFriendDto {
  @IsString()
  @MinLength(1)
  otherUserId!: string;
}
