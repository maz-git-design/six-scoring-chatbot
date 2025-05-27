import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device, DeviceDocument } from './entities/device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    const createdDevice = new this.deviceModel(createDeviceDto);
    return createdDevice.save();
  }

  async findAll(): Promise<DeviceDocument[]> {
    return this.deviceModel.find().exec();
  }

  async findOne(id: string): Promise<DeviceDocument> {
    const device = await this.deviceModel.findById(id).exec();
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async update(
    id: string,
    updateDeviceDto: UpdateDeviceDto,
  ): Promise<DeviceDocument> {
    const updatedDevice = await this.deviceModel
      .findByIdAndUpdate(id, updateDeviceDto, { new: true })
      .exec();

    if (!updatedDevice) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return updatedDevice;
  }

  async remove(id: string): Promise<DeviceDocument> {
    const deletedDevice = await this.deviceModel.findByIdAndDelete(id).exec();
    if (!deletedDevice) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return deletedDevice;
  }

  // Optionally: Add search by code or name
  async findByCode(code: number): Promise<DeviceDocument> {
    const device = await this.deviceModel.findOne({ code }).exec();
    if (!device) {
      throw new NotFoundException(`Device with code ${code} not found`);
    }
    return device;
  }
}
