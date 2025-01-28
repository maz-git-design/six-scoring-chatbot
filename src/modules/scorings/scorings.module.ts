import { Module } from '@nestjs/common';
import { ScoringsService } from './scorings.service';
import { ScoringsController } from './scorings.controller';

@Module({
  controllers: [ScoringsController],
  providers: [ScoringsService],
})
export class ScoringsModule {}
