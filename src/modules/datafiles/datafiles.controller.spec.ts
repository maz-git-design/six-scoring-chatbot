import { Test, TestingModule } from '@nestjs/testing';
import { DatafilesController } from './datafiles.controller';
import { DatafilesService } from './datafiles.service';

describe('DatafilesController', () => {
  let controller: DatafilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatafilesController],
      providers: [DatafilesService],
    }).compile();

    controller = module.get<DatafilesController>(DatafilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
