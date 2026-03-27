import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TranslateMessageDto {
  @IsString()
  @MaxLength(20)
  targetLanguage!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sourceLanguage?: string;
}
