import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Define the possible statuses for the user
export type Status = 'pending' | 'activated' | 'suspended';

// Extend the base Document class from Mongoose
export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Enable timestamps to automatically add createdAt and updatedAt fields
export class User {
  @Prop({ type: String }) // 'name' field, required
  name: string;

  @Prop({ type: String }) // 'surname' field, required
  surname: string;

  @Prop({ type: Date }) // 'birthday' field, required and must be a valid date
  birthday: Date;

  @Prop({ unique: true }) // 'phone' field, required and must be unique
  phone: string;

  @Prop({ unique: true }) // 'idNumber' field, required and must be unique
  idNumber: string;

  @Prop({ type: String }) // 'address' field,
  address: string;

  @Prop({ type: String }) // 'biometricMethod' field
  biometricMethod: string;

  @Prop({ type: String }) // 'whasappsId' field, (note the corrected spelling of "whatsappId" if needed)
  whasappsId: string;

  @Prop({ type: String }) // 'idCardPhotoUrl' field,
  idCardPhotoUrl: string;

  @Prop({ type: String }) // 'idCardFacePhotoUrl' field,
  idCardFacePhotoUrl: string;

  @Prop({ type: Object }) // 'fingerprintData' field, optional, can be any type
  fingerprintData: any;

  @Prop({ type: Object }) // 'facerecognitionData' field, optional, can be any type
  facerecognitionData: any;

  @Prop({
    required: true,
    enum: ['pending', 'activated', 'suspended'],
    default: 'pending',
  })
  // 'status' field, required, must be one of the specified values, default is 'pending'
  status: Status;

  @Prop({ required: true, type: Number, default: 0 }) // 'step' field, required, defaults to 0
  step: number;
}

// Create the schema from the User class
export const UserSchema = SchemaFactory.createForClass(User);
