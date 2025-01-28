import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappAgentModule } from './modules/whatsapp-agent/whatsapp-agent.module';
import { UsersModule } from './modules/users/users.module';
import { DatafilesModule } from './modules/datafiles/datafiles.module';
import { ScoringsModule } from './modules/scorings/scorings.module';
import { MongooseModule } from '@nestjs/mongoose';
import constants from './configs/constants';
import mongooseModuleOptions from './configs/mongoose-module-options';

@Module({
  imports: [
    WhatsappAgentModule,
    UsersModule,
    DatafilesModule,
    ScoringsModule,
    MongooseModule.forRoot(constants.mongoUrl, mongooseModuleOptions),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
