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
import { Role, WaitingAction } from '../entities/user.schema';

export enum Status {
  PENDING = 'pending',
  ACTIVATED = 'activated',
  SUSPENDED = 'suspended',
}

export class CreateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsOptional()
  birthday?: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsPhoneNumber()
  @IsOptional()
  refPhone?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  clerkId?: string;

  @IsString()
  @IsOptional()
  biometricMethod?: string;

  @IsString()
  @IsOptional()
  whasappsId: string;

  @IsString()
  @IsOptional()
  waitingAction?: WaitingAction;

  @IsUrl()
  @IsOptional()
  idCardPhotoUrl?: string;

  @IsUrl()
  @IsOptional()
  idCardFacePhotoUrl?: string;

  @IsDefined()
  @IsOptional()
  fingerprintData?: any;

  @IsDefined()
  @IsOptional()
  facerecognitionData?: any;

  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;

  @IsNumber()
  step: number;

  @IsEnum(Role)
  @IsNotEmpty()
  role?: Role;
}
