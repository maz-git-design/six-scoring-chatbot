import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Define the possible statuses for the user
export type Status = 'pending' | 'activated' | 'suspended';

export enum Role {
  CUSTOMER = 'customer',
  AGENT = 'agent',
}

export type WaitingAction =
  | 'name'
  | 'surname'
  | 'birthday'
  | 'phone'
  | 'idNumber'
  | 'refPhone'
  | 'address'
  | 'biometricMethod'
  | 'idCardPhotoUrl'
  | 'idCardFacePhotoUrl'
  | 'fingerprintData'
  | 'facerecognitionData'
  | 'phoneForVerification'
  | 'scoringVerification'
  | 'choosingMenu'
  | 'role'
  | 'starting';

// Extend the base Document class from Mongoose
export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Enable timestamps to automatically add createdAt and updatedAt fields
export class User {
  @Prop({ type: String }) // 'name' field, required
  name: string;

  @Prop({ type: String }) // 'surname' field, required
  surname: string;

  @Prop({ type: String }) // 'birthday' field, required and must be a valid date
  birthday: string;

  @Prop({ type: String }) // 'phone' field, required and must be unique
  phone: string;

  @Prop({ type: String }) // 'idNumber' field, required and must be unique
  idNumber: string;

  @Prop({ type: String }) // 'refPhone' field, optional, can be null or undefined
  refPhone: string;

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

  @Prop({ type: String }) // 'password' field, required
  password: string;

  @Prop({ type: Date }) // 'lastLoginDate' field, optional, can be null or undefined
  lastLoginDate: Date;

  @Prop({
    enum: [
      'name',
      'surname',
      'birthday',
      'phone',
      'idNumber',
      'refPhone',
      'address',
      'biometricMethod',
      'idCardPhotoUrl',
      'idCardFacePhotoUrl',
      'fingerprintData',
      'facerecognitionData',
      'phoneForVerification',
      'scoringVerification',
      'choosingMenu',
      'starting',
    ],
  })
  waitingAction: WaitingAction;

  @Prop({ type: Date }) // 'lastStepUpdateDate' field, optional, can be null or undefined
  lastStepUpdateDate: Date;

  @Prop({
    required: true,
    enum: ['pending', 'activated', 'suspended'],
    default: 'pending',
  })
  // 'status' field, required, must be one of the specified values, default is 'pending'
  status: Status;

  @Prop({ required: true, type: Number, default: -1 }) // 'step' field, required, defaults to 0
  step: number;

  @Prop({ type: String, enum: ['customer', 'agent'], default: 'customer' }) // 'role' field, optional, can be null or undefined
  role: Role;

  @Prop()
  otp: string;
}

// Create the schema from the User class
export const UserSchema = SchemaFactory.createForClass(User);
