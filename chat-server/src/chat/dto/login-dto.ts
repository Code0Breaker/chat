import { IsEmail, IsJWT, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class Token {
  @IsJWT()
  token: string;
}
