import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: String, unique: true })
  phoneNumber: string;

  @Prop({ type: Date })
  reportDate: Date;

  @Prop({ type: Date })
  firstCallDate: Date;

  @Prop({ type: Number })
  airtimeTotalTopUp: number;

  @Prop({ type: Number })
  momoTotalTopUp: number;
}

export type ReportDocument = Report & Document;
export const ReportSchema = SchemaFactory.createForClass(Report);
