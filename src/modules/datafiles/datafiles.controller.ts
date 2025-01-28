import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DatafilesService } from './datafiles.service';
import { CreateDatafileDto } from './dto/create-datafile.dto';
import { UpdateDatafileDto } from './dto/update-datafile.dto';

@Controller('datafiles')
export class DatafilesController {
  constructor(private readonly datafilesService: DatafilesService) {}

  @Post()
  create(@Body() createDatafileDto: CreateDatafileDto) {
    return this.datafilesService.create(createDatafileDto);
  }

  @Get()
  findAll() {
    return this.datafilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.datafilesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDatafileDto: UpdateDatafileDto) {
    return this.datafilesService.update(+id, updateDatafileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.datafilesService.remove(+id);
  }
}
