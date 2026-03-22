import { IsString, MinLength, Matches } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  accessToken!: string;

  @IsString()
  refreshToken!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[\W_])/, {
    message: 'Password must contain 1 uppercase and 1 special character',
  })
  newPassword!: string;
}
