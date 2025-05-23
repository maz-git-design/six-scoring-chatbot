import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type BillDocument = Bill & Document;

@Schema({ timestamps: true })
export class Bill {
  @Prop({ type: Number })
  remoteId: number;

  @Prop({ type: String })
  customerPhone: string;

  @Prop({ type: String })
  billType: string;

  @Prop({ type: String })
  billTypeCode: string;

  @Prop({ type: String })
  billNo: string;

  @Prop({ type: String })
  customerId: string;

  @Prop({ type: Number })
  billAmount: number;

  @Prop({ type: Number })
  deviceId: number;

  @Prop({ type: Number })
  billStatus: number;

  @Prop({ type: Date })
  createTime: Date;

  @Prop({ type: Date })
  notifyTime: Date;

  @Prop({ type: Date })
  overdueTime: Date;

  @Prop({ type: Date })
  payTime: Date;

  @Prop({ type: Number })
  settledAmount: number;

  @Prop({ type: String })
  customerName: string;

  @Prop({ type: String })
  deviceCode: string;
}

export const BillSchema = SchemaFactory.createForClass(Bill);
