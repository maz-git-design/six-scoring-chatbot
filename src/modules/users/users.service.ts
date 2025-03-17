import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.schema';
import { Model, Types } from 'mongoose';
import { randomInt } from 'crypto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.findByPhone(createUserDto.phone);

    if (existingUser) {
      console.log('######################13', existingUser);
      throw new Error('User with this phone already exists');
    }
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  findAll() {
    return this.userModel.find().exec();
  }

  findOne(_id: Types.ObjectId) {
    const userFound = this.userModel.findById({ _id }).exec();

    if (!userFound) {
      throw new NotFoundException('User not found');
    }
    return userFound;
  }

  async findByPhone(phone: string): Promise<UserDocument> {
    const userFound = await this.userModel.findOne({ phone: phone });

    if (!userFound) {
      throw new NotFoundException('User not found');
    }
    return userFound;
  }

  findByWhatsappId(id: string) {
    const userFound = this.userModel.findOne({ whasappsId: id }).exec();

    if (!userFound) {
      throw new NotFoundException('User not found');
    }
    return userFound;
  }

  async generateOTP(phone: string) {
    const pinCode = randomInt(100000, 999999);
    console.log(pinCode);

    const userUpdated = await this.userModel.findOneAndUpdate(
      { phone: phone },
      { otp: pinCode.toString() },
      { new: true },
    );

    if (!userUpdated) throw new NotFoundException('User not found');

    return userUpdated;
  }

  async verifyOtp(id: string, otp: string) {
    const userFound = await this.userModel.findOne({ whasappsId: id });
    //const userFound = await this.userModel.findOne({ phone: phone });

    if (!userFound) throw new NotFoundException('User not found');

    if (userFound.otp.trim() === otp.trim()) {
      userFound.otp = null;
      return userFound;
    } else {
      throw new NotFoundException('OTP is not correct');
    }
  }

  update(_id: Types.ObjectId, updateUserDto: UpdateUserDto) {
    const updatedUser = this.userModel.findByIdAndUpdate(_id, updateUserDto, {
      new: true,
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
