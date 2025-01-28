import { Injectable } from '@nestjs/common';
import { CreateDatafileDto } from './dto/create-datafile.dto';
import { UpdateDatafileDto } from './dto/update-datafile.dto';

@Injectable()
export class DatafilesService {
  create(createDatafileDto: CreateDatafileDto) {
    return 'This action adds a new datafile';
  }

  findAll() {
    return `This action returns all datafiles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} datafile`;
  }

  update(id: number, updateDatafileDto: UpdateDatafileDto) {
    return `This action updates a #${id} datafile`;
  }

  remove(id: number) {
    return `This action removes a #${id} datafile`;
  }
}
