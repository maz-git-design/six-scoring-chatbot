import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LoanStatus {
  PAID = 'paid',
  ONGOING = 'ongoing',
  CANCELLED = 'cancelled',
  WAITINGPAYMENT = 'waitingPayment',
  INITIATED = 'initiated',
}

export enum LoanType {
  DEVICE = 'device',
  MONEY = 'money',
}

export enum SettlementType {
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
}

export type Settlement = {
  type: SettlementType;
  numberOfPayments: 4 | 8 | 16;
};

// Extend the base Document class from Mongoose
export type LoanDocument = Loan & Document;

@Schema({ timestamps: true }) // Enable timestamps to automatically add createdAt and updatedAt fields
export class Loan {
  @Prop({ type: String, default: LoanType.DEVICE })
  loanType: LoanType;

  @Prop({ type: String })
  name: string;

  @Prop({ type: Number })
  settlementCounter: number;

  @Prop({ type: String })
  description: string;

  @Prop({ type: Number })
  totalAmount: number;

  @Prop({ type: Number })
  activationFee: number;

  @Prop({ type: Number, default: 0 })
  paidAmount: number;

  @Prop({ type: String })
  activationCode: string;

  @Prop({
    type: {
      type: String,
      numberOfPayments: Number,
    },
  })
  settlement: Settlement;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ type: Array, ref: 'Transaction' })
  transactions: Types.ObjectId[];

  @Prop({ type: String, default: LoanStatus.INITIATED })
  status: LoanStatus;

  @Prop({ type: Date })
  activationPaymentDate: Date;
}

export const LoanSchema = SchemaFactory.createForClass(Loan);
