import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBillDto {
  @IsNumber()
  remoteId: number;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  billType: string;

  @IsOptional()
  @IsString()
  billTypeCode: string;

  @IsString()
  billNo: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  billAmount: number;

  @IsNumber()
  deviceId: number;

  @IsOptional()
  @IsString()
  billStatus: number;

  @IsDateString()
  createTime: Date;

  @IsDateString()
  notifyTime: Date;

  @IsDateString()
  overdueTime: Date;

  @IsDateString()
  payTime: Date;

  @IsNumber()
  settledAmount: number;

  @IsString()
  customerName: string;

  @IsDateString()
  deviceCode: string;
}
