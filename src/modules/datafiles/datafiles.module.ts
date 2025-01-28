import { Module } from '@nestjs/common';
import { DatafilesService } from './datafiles.service';
import { DatafilesController } from './datafiles.controller';

@Module({
  controllers: [DatafilesController],
  providers: [DatafilesService],
})
export class DatafilesModule {}
