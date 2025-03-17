import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Model, Types } from 'mongoose';
import { LoansService } from '../loans/loans.service';
import { UpdateLoanDto } from '../loans/dto/update-loan.dto';

@Injectable()
export class TransactionsService {
  private populate = [{ path: 'owner', model: 'User' }];
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private readonly loanService: LoansService,
  ) {}
  async create(createLoanDto: CreateTransactionDto) {
    const createdTransaction = new this.transactionModel(createLoanDto);
    const cr = await createdTransaction.save();

    return cr.populate(this.populate);
  }
  findAll() {
    return `This action returns all transactions`;
  }
  findOne(_id: Types.ObjectId) {
    const transactionFound = this.transactionModel.findById({ _id }).exec();

    if (!transactionFound) {
      throw new NotFoundException('Loan not found');
    }
    return transactionFound;
  }

  findByUser(userId: Types.ObjectId) {
    const transactionsFound = this.transactionModel
      .find({ owner: userId })
      .exec();

    if (!transactionsFound) {
      throw new NotFoundException('Loans not found');
    }
    return transactionsFound;
  }

  async findByTransactionId(transactionId: string) {
    const transactionFound = this.transactionModel
      .findOne({ transactionId })
      .exec();

    if (!transactionFound) {
      throw new NotFoundException('Transaction not found');
    }
    return transactionFound;
  }

  update(_id: Types.ObjectId, updateTransactionDto: UpdateTransactionDto) {
    const updatedTransaction = this.transactionModel.findByIdAndUpdate(
      _id,
      updateTransactionDto,
      {
        new: true,
      },
    );

    if (!updatedTransaction) {
      throw new NotFoundException('User not found');
    }
    return updatedTransaction;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }

  async addTransaction(
    phone: string,
    createTransactionDto: CreateTransactionDto,
  ) {
    const result = await this.loanService.verifyExistingLoan(phone);

    if (!result) {
      throw new NotFoundException('Loan not found');
    }

    const createdTransaction = await this.create(createTransactionDto);

    //const transactionId = new Types.ObjectId(createdTransaction._id as string);

    const updatedLoan = await this.loanService.addTransactionToLoan(phone, {
      transactions: [createdTransaction._id as string],
    });

    return updatedLoan;
  }
}
