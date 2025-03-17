import { Module } from '@nestjs/common';
import { ScoringsService } from './scorings.service';
import { ScoringsController } from './scorings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Scoring, ScoringSchema } from './schemas/scoring.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Scoring.name, schema: ScoringSchema }]),
  ],
  controllers: [ScoringsController],
  providers: [ScoringsService],
  exports: [ScoringsService],
})
export class ScoringsModule {}
