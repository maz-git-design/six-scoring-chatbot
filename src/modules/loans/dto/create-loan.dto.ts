import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SettlementType,
  LoanType,
  Settlement,
  LoanStatus,
} from '../schemas/loan.schema';

export class SettlementDto {
  @IsOptional()
  @IsEnum(SettlementType)
  type?: SettlementType;

  @IsOptional()
  @IsEnum([4, 8, 16] as const) // Only allows these specific numbers
  numberOfPayments?: number;
}

export class CreateLoanDto {
  @IsOptional()
  @IsEnum(LoanType)
  loanType?: LoanType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  settlementCounter?: number;

  @IsOptional()
  @IsNumber()
  activationFee?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsString()
  activationCode?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SettlementDto)
  settlement?: Settlement;

  @IsOptional()
  @IsMongoId()
  user?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  transactions?: string[];

  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @IsOptional()
  @IsDateString()
  nextDueDate?: Date;

  @IsOptional()
  @IsNumber()
  delayOfNextPayment?: number;

  @IsOptional()
  @IsDateString()
  activationPaymentDate?: Date;
}
