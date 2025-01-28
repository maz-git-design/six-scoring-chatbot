import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  create(createUserDto: CreateUserDto) {
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
