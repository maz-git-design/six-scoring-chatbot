import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ScoringsService } from './scorings.service';
import { CreateScoringDto } from './dto/create-scoring.dto';
import { UpdateScoringDto } from './dto/update-scoring.dto';

@Controller('scorings')
export class ScoringsController {
  constructor(private readonly scoringsService: ScoringsService) {}

  @Post()
  create(@Body() createScoringDto: CreateScoringDto) {
    return this.scoringsService.create(createScoringDto);
  }

  @Get()
  findAll() {
    return this.scoringsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scoringsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateScoringDto: UpdateScoringDto) {
    return this.scoringsService.update(+id, updateScoringDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scoringsService.remove(+id);
  }
}
