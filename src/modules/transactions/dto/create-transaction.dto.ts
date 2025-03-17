import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  TransactionReason,
  TransactionStatus,
} from '../schemas/transaction.schema';

export class CreateTransactionDto {
  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  payerWhatsappId?: string;

  @IsOptional()
  @IsString()
  payerPhone?: string;

  @IsOptional()
  @IsString()
  payerMessage?: string;

  @IsOptional()
  @IsString()
  payerNote?: string;

  @IsOptional()
  @IsMongoId()
  owner?: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  failedReason?: string;

  @IsOptional()
  @IsEnum(TransactionReason)
  transactionReason?: TransactionReason;
}
