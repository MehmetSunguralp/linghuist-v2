import { IsOptional, IsString } from 'class-validator';

export class ConfirmEmailDto {
  @IsString()
  accessToken!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;
}
