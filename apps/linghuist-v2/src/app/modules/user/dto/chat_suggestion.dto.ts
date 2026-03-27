import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatSuggestionDto {
  @IsString()
  @MaxLength(20)
  userLanguage!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  chatLanguage?: string;
}
