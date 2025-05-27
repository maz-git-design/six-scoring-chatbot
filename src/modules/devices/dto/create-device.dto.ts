import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateDeviceDto {
  @IsNumber()
  @IsNotEmpty()
  code: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsNumber()
  @IsNotEmpty()
  activationFee: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}
