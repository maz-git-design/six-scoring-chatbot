import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateScoringDto } from './dto/create-scoring.dto';
import { UpdateScoringDto } from './dto/update-scoring.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Scoring, ScoringDocument } from './schemas/scoring.schema';
import { Model } from 'mongoose';

@Injectable()
export class ScoringsService {
  constructor(
    @InjectModel(Scoring.name) private scoringModel: Model<ScoringDocument>,
  ) {}
  create(createScoringDto: CreateScoringDto) {
    return 'This action adds a new scoring';
  }

  findAll() {
    return `This action returns all scorings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} scoring`;
  }

  async findScoringByUserPhone(phone: string) {
    const scoring = await this.scoringModel
      .findOne({ phoneNumber: phone })
      .exec();

    if (!scoring) {
      throw new NotFoundException('Scoring not found');
    }

    return scoring;
  }

  update(id: number, updateScoringDto: UpdateScoringDto) {
    return `This action updates a #${id} scoring`;
  }

  remove(id: number) {
    return `This action removes a #${id} scoring`;
  }
}
