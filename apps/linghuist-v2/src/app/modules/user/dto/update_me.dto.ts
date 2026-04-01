import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  MaxLength,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Partial profile update; all fields optional (PATCH-style). Email is immutable after signup. */
export class UpdateMeDto {
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
  thumbnailUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  languagesKnown?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  languagesLearning?: string[];

  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(13)
  @Max(120)
  age?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string | null;
}
