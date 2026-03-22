import { IsEmail, IsOptional, IsString } from 'class-validator';

/** Partial profile update; all fields optional (PATCH-style). */
export class UpdateMeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  nativeLanguage?: string | null;

  @IsOptional()
  @IsString()
  learningLanguage?: string | null;

  @IsOptional()
  @IsString()
  level?: string | null;

  @IsOptional()
  @IsString()
  bio?: string | null;
}
