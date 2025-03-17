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

@Module({
  controllers: [WhatsappAgentController],
  imports: [UsersModule, ScoringsModule, LoansModule, TransactionsModule],
  providers: [WhatsappAgentService, PaymentService, AuthPaymentService],
})
export class WhatsappAgentModule {}
