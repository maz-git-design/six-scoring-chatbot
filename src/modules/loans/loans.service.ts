import { UsersService } from './../users/users.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Loan, LoanDocument } from './schemas/loan.schema';
import { Model, Types } from 'mongoose';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class LoansService {
  private populate = [
    { path: 'user', model: 'User' },
    { path: 'transactions', model: 'Transaction' },
  ];
  constructor(
    @InjectModel(Loan.name) private loanModel: Model<LoanDocument>,
    private readonly usersService: UsersService,
  ) {}
  create(createLoanDto: CreateLoanDto) {
    const createdLoan = new this.loanModel(createLoanDto);
    createdLoan.save();

    return createdLoan.populate(this.populate);
  }

  findAll() {
    return `This action returns all loans`;
  }

  findOne(_id: Types.ObjectId) {
    const transactionFound = this.loanModel.findById({ _id }).exec();

    if (!transactionFound) {
      throw new NotFoundException('Loan not found');
    }
    return transactionFound;
  }

  findByUser(userId: Types.ObjectId) {
    const loansFound = this.loanModel.find({ user: userId }).exec();

    if (!loansFound) {
      throw new NotFoundException('Loans not found');
    }
    return loansFound;
  }

  async findOneByPhone(phone: string) {
    const user = await this.usersService.findByPhone(phone);
    const loansFound = this.loanModel.findOne({ user: user._id }).exec();

    if (!loansFound) {
      throw new NotFoundException('Loan not found');
    }
    return loansFound;
  }

  async findByStatus(status: string) {
    const loansFound = this.loanModel
      .find({ status: status })
      .populate(this.populate)
      .exec();

    if (!loansFound) {
      throw new NotFoundException('Loans not found');
    }

    return loansFound;
  }

  update(_id: Types.ObjectId, updateloanDto: UpdateLoanDto) {
    const updatedLoan = this.loanModel.findByIdAndUpdate(_id, updateloanDto, {
      new: true,
    });

    if (!updatedLoan) {
      throw new NotFoundException('Loan not found');
    }
    return updatedLoan;
  }

  async updateByPhone(phone: string, updateloanDto: UpdateLoanDto) {
    const user = await this.usersService.findByPhone(phone);
    const loanToUpdate = await this.loanModel
      .findOne({ user: user._id })
      .exec();

    if (!loanToUpdate) {
      throw new NotFoundException('Loan not found with this phone number');
    }

    const updatedLoan = this.loanModel.findByIdAndUpdate(
      loanToUpdate._id,
      updateloanDto,
      {
        new: true,
      },
    );

    return updatedLoan;
  }

  async verifyExistingLoan(phone: string) {
    const user = await this.usersService.findByPhone(phone);

    console.log('##########', user);

    const loan = await this.loanModel.findOne({ user: user._id }).exec();

    if (!loan) {
      return false;
    }

    return true;
  }

  async addTransactionToLoan(phone: string, updateloanDto: UpdateLoanDto) {
    const user = await this.usersService.findByPhone(phone);
    const updatedLoan = await this.loanModel.updateOne(
      { user: user._id },
      { $push: { transactions: updateloanDto.transactions[0] } },
    );

    if (!updatedLoan) {
      throw new NotFoundException('Loan not found with this phone number');
    }

    return updatedLoan;
  }

  remove(id: number) {
    return `This action removes a #${id} loan`;
  }
}
