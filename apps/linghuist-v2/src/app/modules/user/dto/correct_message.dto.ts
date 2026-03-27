import { IsString, MaxLength } from 'class-validator';

export class CorrectMessageDto {
  @IsString()
  @MaxLength(2000)
  correctedText!: string;
}
