import { IsString, MinLength } from 'class-validator';

export class DeleteMeDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
