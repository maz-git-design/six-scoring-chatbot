import { Module } from '@nestjs/common';
import { WhatsappAgentService } from './whatsapp-agent.service';
import { WhatsappAgentController } from './whatsapp-agent.controller';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';
import { ScoringsModule } from '../scorings/scorings.module';
import { PaymentService } from 'src/services/payment/payment.service';
import { AuthPaymentService } from 'src/services/payment/auth-payment.service';
import { LoansModule } from '../loans/loans.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SessionModule } from 'src/session/session.module';
import { SessionService } from 'src/session/session.service';
import { FilesModule } from '../files/files.module';
import { FilesService } from '../files/files.service';
import { DevicesModule } from '../devices/devices.module';
import { DevicesService } from '../devices/devices.service';

@Module({
  controllers: [WhatsappAgentController],
  imports: [
    UsersModule,
    ScoringsModule,
    LoansModule,
    TransactionsModule,
    SessionModule,
    FilesModule,
    DevicesModule,
  ],
  providers: [
    WhatsappAgentService,
    PaymentService,
    AuthPaymentService,
    FilesService,
  ],
})
export class WhatsappAgentModule {}
