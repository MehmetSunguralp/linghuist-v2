import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[\W_])/, {
    message: 'Password must contain 1 uppercase and 1 special character',
  })
  password!: string;

  @IsString()
  confirmPassword!: string;
}
