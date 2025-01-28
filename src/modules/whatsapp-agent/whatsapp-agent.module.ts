import { Module } from '@nestjs/common';
import { WhatsappAgentService } from './whatsapp-agent.service';
import { WhatsappAgentController } from './whatsapp-agent.controller';

@Module({
  controllers: [WhatsappAgentController],
  providers: [WhatsappAgentService],
})
export class WhatsappAgentModule {}
