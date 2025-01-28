import {
  IsString,
  IsDate,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUrl,
  IsPhoneNumber,
  IsDefined,
  IsBase64,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum Status {
  PENDING = 'pending',
  ACTIVATED = 'activated',
  SUSPENDED = 'suspended',
}

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  surname: string;

  @IsDate()
  @Type(() => Date)
  birthday: Date;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsString()
  idNumber: string;

  @IsString()
  address: string;

  @IsString()
  biometricMethod: string;

  @IsString()
  whasappsId: string;

  @IsUrl()
  idCardPhotoUrl: string;

  @IsUrl()
  idCardFacePhotoUrl: string;

  @IsDefined()
  fingerprintData: any;

  @IsDefined()
  facerecognitionData: any;

  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;

  @IsNumber()
  step: number;
}
