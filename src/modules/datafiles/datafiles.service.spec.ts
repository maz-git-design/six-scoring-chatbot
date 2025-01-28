import { Test, TestingModule } from '@nestjs/testing';
import { DatafilesService } from './datafiles.service';

describe('DatafilesService', () => {
  let service: DatafilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatafilesService],
    }).compile();

    service = module.get<DatafilesService>(DatafilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
