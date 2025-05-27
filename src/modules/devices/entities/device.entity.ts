import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Device {
  @Prop({ required: true, type: Number })
  code: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  model: string;

  @Prop({ required: true, type: Number })
  activationFee: number;

  @Prop({ required: true, type: Number })
  price: number;
}

export type DeviceDocument = Device & Document;
export const DeviceSchema = SchemaFactory.createForClass(Device);
