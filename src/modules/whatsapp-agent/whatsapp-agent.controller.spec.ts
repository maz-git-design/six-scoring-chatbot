import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappAgentController } from './whatsapp-agent.controller';
import { WhatsappAgentService } from './whatsapp-agent.service';

describe('WhatsappAgentController', () => {
  let controller: WhatsappAgentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappAgentController],
      providers: [WhatsappAgentService],
    }).compile();

    controller = module.get<WhatsappAgentController>(WhatsappAgentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
