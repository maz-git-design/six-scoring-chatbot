import { PartialType } from '@nestjs/mapped-types';
import { CreateDatafileDto } from './create-datafile.dto';

export class UpdateDatafileDto extends PartialType(CreateDatafileDto) {}
