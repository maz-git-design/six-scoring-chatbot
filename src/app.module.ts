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
import { BillsModule } from './modules/bills/bills.module';
import { SessionModule } from './session/session.module';
import { MinioModule } from './modules/minio/minio.module';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from './modules/files/files.module';
@Module({
  imports: [
    WhatsappAgentModule,
    ConfigModule.forRoot({
      isGlobal: true, // allows usage in all modules without re-import
      ignoreEnvFile: true, // prevents loading.env file
      envFilePath: '.env',
    }),
    UsersModule,
    DatafilesModule,
    ScoringsModule,
    ScheduleModule.forRoot(),
    LoggerModule.forRoot(),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/myappdb',
      mongooseModuleOptions,
    ),
    ReportsModule,
    TransactionsModule,
    LoansModule,
    BillsModule,
    SessionModule,
    MinioModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
