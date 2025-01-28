import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { WhatsappAgentService } from './whatsapp-agent.service';
import { CreateWhatsappAgentDto } from './dto/create-whatsapp-agent.dto';
import { UpdateWhatsappAgentDto } from './dto/update-whatsapp-agent.dto';

@Controller('whatsapp-agent')
export class WhatsappAgentController {
  constructor(private readonly whatsappAgentService: WhatsappAgentService) {}

  @Post()
  create(@Body() createWhatsappAgentDto: CreateWhatsappAgentDto) {
    return this.whatsappAgentService.create(createWhatsappAgentDto);
  }

  @Post('send')
  async sendMessage(@Body() body: { jid: string; message: string }) {
    const { jid, message } = body;
    try {
      await this.whatsappAgentService.sendMessage(jid, message);
      return { success: true, message: 'Message sent!' };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Failed to send message', error };
    }
  }

  @Get('groups')
  async getAllGroups() {
    return await this.whatsappAgentService.getAllGroups();
  }

  // @Get('groups/:subject')
  // async getGroupBySubject(@Param('subject') subject: string) {
  //   return await this.whatsappAgentService.getGroupBySubject(subject);
  // }

  @Get()
  findAll() {
    return this.whatsappAgentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.whatsappAgentService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWhatsappAgentDto: UpdateWhatsappAgentDto,
  ) {
    return this.whatsappAgentService.update(+id, updateWhatsappAgentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.whatsappAgentService.remove(+id);
  }
}
