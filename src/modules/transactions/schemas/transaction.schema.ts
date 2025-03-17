import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TransactionStatus {
  SUCCESS = 'SUCCESSFUL',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export enum TransactionReason {
  DEVICE_ACTIVATION = 'activationFee',
  PAY_SETTLEMENT = 'settlementPayment',
  FAILED = 'failed',
}

// Extend the base Document class from Mongoose
export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true }) // Enable timestamps to automatically add createdAt and updatedAt fields
export class Transaction {
  @Prop({ type: String })
  transactionId: string;

  @Prop({ type: String })
  referenceId: string;

  @Prop({ type: String })
  externalId: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: String })
  currency: string;

  @Prop({ type: String })
  payerWhatsappId?: string;

  @Prop({ type: String })
  payerPhone: string;

  @Prop({ type: String })
  payerMessage: string;

  @Prop({ type: String })
  payerNote: string;

  @Prop({ type: String })
  failedReason: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  owner: Types.ObjectId;

  @Prop({ type: String })
  status: TransactionStatus;

  @Prop({ type: String })
  transactionReason: TransactionReason;
}

// Create the schema from the User class
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
