import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  fullname: string;

  @IsEmail()
  email: string;

  picture?: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  phone: string;
}