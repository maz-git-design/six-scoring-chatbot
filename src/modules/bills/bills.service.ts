import { Injectable } from '@nestjs/common';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Bill, BillDocument } from './schemas/bill.schema';
import { Model } from 'mongoose';

@Injectable()
export class BillsService {
  constructor(@InjectModel(Bill.name) private billModel: Model<BillDocument>) {}

  create(createBillDto: CreateBillDto) {
    const createdBill = new this.billModel(createBillDto);
    createdBill.save();

    return createdBill;
  }

  findAll() {
    return `This action returns all bills`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bill`;
  }

  update(id: number, updateBillDto: UpdateBillDto) {
    return `This action updates a #${id} bill`;
  }

  remove(id: number) {
    return `This action removes a #${id} bill`;
  }
}
