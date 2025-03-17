import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappAgentModule } from './modules/whatsapp-agent/whatsapp-agent.module';
import { UsersModule } from './modules/users/users.module';
import { DatafilesModule } from './modules/datafiles/datafiles.module';
import { ScoringsModule } from './modules/scorings/scorings.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsModule } from './modules/reports/reports.module';
import constants from './configs/constants';
import mongooseModuleOptions from './configs/mongoose-module-options';
import { LoggerModule, Logger } from 'nestjs-pino';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { LoansModule } from './modules/loans/loans.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    WhatsappAgentModule,
    UsersModule,
    DatafilesModule,
    ScoringsModule,
    ScheduleModule.forRoot(),
    LoggerModule.forRoot(),
    MongooseModule.forRoot(constants.mongoUrl, mongooseModuleOptions),
    ReportsModule,
    TransactionsModule,
    LoansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
