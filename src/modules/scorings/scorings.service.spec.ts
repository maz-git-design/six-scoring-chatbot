import { Test, TestingModule } from '@nestjs/testing';
import { ScoringsService } from './scorings.service';

describe('ScoringsService', () => {
  let service: ScoringsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoringsService],
    }).compile();

    service = module.get<ScoringsService>(ScoringsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
