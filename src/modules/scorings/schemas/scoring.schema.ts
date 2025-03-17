import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScoringDocument = Scoring & Document;
@Schema({ timestamps: true })
export class Scoring {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ type: String })
  phoneNumber: string;

  @Prop({ type: Number })
  fidelityScore: number;

  @Prop({ type: Number })
  airtimeScore: number;

  @Prop({ type: Number })
  momoScore: number;

  @Prop({ type: Number })
  totalScore: number;
}

export const ScoringSchema = SchemaFactory.createForClass(Scoring);
