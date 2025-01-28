import { Test, TestingModule } from '@nestjs/testing';
import { ScoringsController } from './scorings.controller';
import { ScoringsService } from './scorings.service';

describe('ScoringsController', () => {
  let controller: ScoringsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoringsController],
      providers: [ScoringsService],
    }).compile();

    controller = module.get<ScoringsController>(ScoringsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
