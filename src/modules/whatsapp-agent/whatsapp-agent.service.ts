import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CreateWhatsappAgentDto } from './dto/create-whatsapp-agent.dto';
import { UpdateWhatsappAgentDto } from './dto/update-whatsapp-agent.dto';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { UsersService } from '../users/users.service';
import { CreateUserDto, Status } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import {
  Role,
  UserDocument,
  WaitingAction,
} from '../users/entities/user.schema';
import { writeFile } from 'fs/promises';
import { Logger } from 'pino';
import sendOTP from 'src/services/sms/infobip';
import { randomInt } from 'crypto';
import sendTwiloSMS from 'src/services/sms/twilio';
import * as fs from 'fs';
import * as path from 'path';
import { ScoringsService } from '../scorings/scorings.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { LoansService } from '../loans/loans.service';
import { TransactionsService } from '../transactions/transactions.service';
import { Types } from 'mongoose';
import {
  LoanStatus,
  LoanType,
  Settlement,
  SettlementType,
} from '../loans/schemas/loan.schema';
import { CreateLoanDto } from '../loans/dto/create-loan.dto';
import { UpdateLoanDto } from '../loans/dto/update-loan.dto';
import { PaymentService } from 'src/services/payment/payment.service';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { TransactionStatus } from '../transactions/schemas/transaction.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UpdateTransactionDto } from '../transactions/dto/update-transaction.dto';
import { SessionService, UserSessionData } from 'src/session/session.service';
import { AwaitAction } from 'src/session/session.enum';
import { SessionData } from 'h3';
import { AwaitActionRegexMap } from 'src/session/regex-map';
import { SendOtp } from 'src/decorators/otp/send-otp.decorator';
import { OtpVerification } from 'src/decorators/otp/otp-verification.decorator';
import { OtpContext } from 'src/decorators/otp/otp.context';
import { FilesService } from '../files/files.service';
import { DevicesService } from '../devices/devices.service';
import { DeviceDocument } from '../devices/entities/device.entity';

const logger = require('pino')();

const dirPath = path.join(
  process.cwd(),
  'src',
  'modules',
  'whatsapp-agent',
  'temp',
);

const tempUsersFilePath = path.join(dirPath, 'temp_users.json');

export type TempUser = {
  phone?: string;
  otp?: string;
  whassappsId: string;
  phoneForPay?: string;
};

@Injectable()
export class WhatsappAgentService implements OnModuleInit, OnModuleDestroy {
  private socket;
  private readonly authFile = 'auth_info_baileys';

  private tempUsersJson: TempUser[] = [];
  private device: DeviceDocument;

  constructor(
    private readonly users: UsersService,
    private readonly scorings: ScoringsService,
    private readonly loans: LoansService,
    private readonly transactions: TransactionsService,
    private readonly paymentService: PaymentService,
    private readonly sessionService: SessionService,
    private readonly filesService: FilesService,
    private readonly devicesService: DevicesService,
  ) {}

  // isDifference(date1: string, date2: string, delay: number) {
  //   const diffInMs = Math.abs(
  //     new Date(date1).getTime() - new Date(date2).getTime(),
  //   ); // Get absolute difference in milliseconds
  //   const diffInMinutes = diffInMs / (1000 * 60); // Convert to minutes
  //   return diffInMinutes >= delay; // Check if at least 10 minutes
  // }

  // @Cron(CronExpression.EVERY_30_SECONDS)
  // async handleCron() {
  //   const dateNow = new Date();

  //   // try {
  //   //   const loans = await this.loans.findByStatus(LoanStatus.ONGOING);

  //   //   loans.forEach((loan) => {
  //   //     const nextDate = loan.nextDueDate;
  //   //     const phoneNumber = loan.user['phone'];
  //   //     console.log('Phone', loan.user['phone']);

  //   //     // if (nextDate) {
  //   //     //   if (
  //   //     //     dateNow.getTime() >= nextDate.getTime() &&
  //   //     //     loan.status === LoanStatus.ONGOING
  //   //     //   ) {
  //   //     //     //this.sendReminder(loan);

  //   //     //     sendOTP(
  //   //     //       phoneNumber,
  //   //     //       `This is a reminder to pay your next settlement of ${loan.activationFee} GNF`,
  //   //     //     );
  //   //     //   }
  //   //     // }
  //   //   });

  //   //   //console.log('ICI');
  //   // } catch (error) {}
  // }

  async onModuleInit() {
    this.connectToWhatsApp();
    //this.getTempUsers();
    // sendOTP('243892007346', 'Your OTP is 123456');
    this.device = await this.devicesService.findByCode(1);
    console.log('Device', this.device);
  }

  // getTempUsers() {
  //   const dirPath = path.dirname(tempUsersFilePath);
  //   if (!fs.existsSync(dirPath)) {
  //     fs.mkdirSync(dirPath, { recursive: true }); // Create temp directory
  //   }
  //   if (fs.existsSync(dirPath)) {
  //     const rawData = fs.readFileSync(tempUsersFilePath, 'utf8');
  //     console.log('Row data', rawData);

  //     if (rawData) {
  //       this.tempUsersJson = JSON.parse(rawData);
  //     }
  //   }
  // }

  // addTempUser(tempUser: TempUser, write: boolean = true) {
  //   const exists = this.tempUsersJson.some(
  //     (user) => user.whassappsId === tempUser.whassappsId,
  //   );

  //   if (exists) {
  //     console.log(`⚠️ User with phone ${tempUser.whassappsId} already exists.`);
  //     return;
  //   }

  //   // Add a new regex pattern
  //   this.tempUsersJson.push(tempUser);

  //   // Convert back to JSON and write to file
  //   if (write)
  //     fs.writeFileSync(
  //       tempUsersFilePath,
  //       JSON.stringify(this.tempUsersJson, null, 2),
  //       'utf8',
  //     );
  // }

  // isTempUserExist(tempUser: TempUser) {
  //   const exists = this.tempUsersJson.some(
  //     (user) => user.whassappsId === tempUser.whassappsId,
  //   );

  //   return exists;
  // }

  // deleteTempUserById(whatsappId: string, write: boolean = true) {
  //   if (!fs.existsSync(tempUsersFilePath)) {
  //     console.log('⚠️ File does not exist.');
  //     return;
  //   }

  //   // 2️⃣ Filter out the user by ID
  //   const updatedUsers = this.tempUsersJson.filter(
  //     (user) => user.whassappsId !== whatsappId,
  //   );

  //   // 3️⃣ Write back the updated JSON
  //   if (write)
  //     fs.writeFileSync(
  //       tempUsersFilePath,
  //       JSON.stringify(updatedUsers, null, 2),
  //       'utf8',
  //     );

  //   console.log(`✅ User with ID ${whatsappId} deleted successfully.`);
  // }

  // getTempUserById(whatsappId: string) {
  //   // 2️⃣ Filter out the user by ID
  //   const updatedUser = this.tempUsersJson.filter(
  //     (user) => user.whassappsId == whatsappId,
  //   );

  //   return updatedUser.length > 0 ? updatedUser[0] : null;
  // }

  // getTempUserByIdForPay(whatsappId: string) {
  //   const tUser = this.getTempUserById(whatsappId);

  //   if (!tUser) {
  //     return null;
  //   }

  //   // Check if phoneForPay is available
  //   if (tUser.phoneForPay) {
  //     return tUser;
  //   } else {
  //     return null;
  //   }
  // }

  // updateTempUser(tempUser: TempUser, write: boolean = true) {
  //   // Ensure `this.tempUsersJson` is initialized
  //   if (!this.tempUsersJson) {
  //     this.tempUsersJson = [];
  //   }

  //   // Find index of the existing user
  //   const index = this.tempUsersJson.findIndex(
  //     (user) => user.whassappsId === tempUser.whassappsId,
  //   );

  //   if (index !== -1) {
  //     // Update existing user
  //     this.tempUsersJson[index] = { ...this.tempUsersJson[index], ...tempUser };
  //     // Convert back to JSON and write to file

  //     console.log('hamamma', this.tempUsersJson[index]);
  //     if (write)
  //       fs.writeFileSync(
  //         tempUsersFilePath,
  //         JSON.stringify(this.tempUsersJson, null, 2),
  //         'utf8',
  //       );
  //     console.log(`✅ User updated:`, this.tempUsersJson[index]);
  //   } else {
  //     console.log(`⚠️ User with whatsapp ${tempUser.whassappsId} not found.`);
  //   }
  // }

  async connectToWhatsApp() {
    // utility function to help save the auth state in a single folder
    // this function serves as a good guide to help write auth & key states for SQL/no-SQL databases, which I would recommend in any production grade system
    const { state, saveCreds } = await useMultiFileAuthState(this.authFile);
    this.socket = makeWASocket({
      printQRInTerminal: true,
      auth: state,
      syncFullHistory: false,
    });

    this.socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;
        console.log(
          'connection closed due to ',
          lastDisconnect.error,
          ', reconnecting ',
          shouldReconnect,
        );
        // reconnect if not logged out
        if (shouldReconnect) {
          this.connectToWhatsApp();
        }
      } else if (connection === 'open') {
        console.log('opened connection');
      }
    });
    this.socket.ev.on('creds.update', saveCreds);
    this.socket.ev.on('messages.upsert', async ({ messages }) => {
      const m = messages[0];
      console.log('User message:', messages);

      if (!m.message) return; // if there is no text or media message
      if (m.key.fromMe) return;

      this.handleMessage(m);
    });
  }

  async processImageMessage(m: any) {
    const userWhatsAppId = m.key.remoteJid;
    const userFound = await this.users.findByWhatsappId(userWhatsAppId);

    if (!userFound) {
      await this.socket.sendMessage(userWhatsAppId, {
        text: "Vous n'avez pas de compte avec ce numéro. Veuillez d'abord vous inscrire.",
      });
      await this.sessionService.set(userWhatsAppId, {
        waitingAction: AwaitAction.AWAIT_MAIN_MENU,
      });
      return;
    }

    if (userFound.step === 7 || userFound.step === 8 || userFound.step === 9) {
      let mockMulterFile: Express.Multer.File;
      try {
        const stream = await downloadMediaMessage(
          m,
          'stream',
          {},
          {
            logger,
            reuploadRequest: this.socket.updateMediaMessage,
          },
        );

        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        mockMulterFile = {
          fieldname: 'file',
          originalname: 'media.jpg', // you can customize this if you know the actual name
          encoding: '7bit',
          mimetype: 'image/jpeg', // adjust based on content type
          buffer: buffer,
          size: buffer.length,
          destination: '',
          filename: '',
          path: '',
          stream: undefined, // not required for buffer-based handling
        };
      } catch (error) {
        console.log('Erreur de téléchargement ', error);
        await this.socket.sendMessage(userWhatsAppId, {
          text: 'Erreur rencontrée lors du téléchargement de votre image. Veuillez ressayez plutard ...',
        });
        return;
      }

      // Construct a pseudo Express.Multer.File object

      var filename = '';

      if (userFound.step === 7) {
        filename = `${userFound.idNumber}-card`;
        try {
          const result = await this.filesService.uploadFileFromWhatsApp(
            mockMulterFile,
            filename,
          );
          await this.updateField(
            userWhatsAppId,
            'idCardPhotoUrl',
            "Photo de la carte d'identité",
            filename,
            userFound.step + 1,
          );
          await this.setNextStep(userWhatsAppId, userFound.step + 1);
        } catch (error) {
          console.log("Erreur d'envoie minio ", error);
          await this.socket.sendMessage(userWhatsAppId, {
            text: 'Erreur rencontrée lors du traitement de votre image. Veuillez ressayez plutard ...',
          });
          return;
        }
      } else if (userFound.step === 8) {
        filename = `${userFound.idNumber}-facecard`;
        try {
          const result = await this.filesService.uploadFileFromWhatsApp(
            mockMulterFile,
            filename,
          );
          await this.updateFieldNew(
            userWhatsAppId,
            'idCardFacePhotoUrl',
            "Carte d'identité avec photo",
            filename,
            userFound.step + 1,
          );
        } catch (error) {
          console.log("Erreur d'envoie minio ", error);
          await this.socket.sendMessage(userWhatsAppId, {
            text: 'Erreur rencontrée lors du traitement de votre image. Veuillez ressayez plutard ...',
          });
        }
      } else if (userFound.step === 9) {
        filename = `${userFound.idNumber}-facerecongition`;
        try {
          const result = await this.filesService.uploadFileFromWhatsApp(
            mockMulterFile,
            filename,
          );

          await this.updateFieldNew(
            userWhatsAppId,
            'facerecognitionData',
            'Image de reconnaissance faciale',
            filename,
            userFound.step + 1,
          );
        } catch (error) {
          console.log("Erreur d'envoie minio ", error);
          await this.socket.sendMessage(userWhatsAppId, {
            text: 'Erreur rencontrée lors du traitement de votre image. Veuillez ressayez plutard ...',
          });
        }
      }

      //await writeFile(url, buffer);
    } else {
      await this.socket.sendMessage(userWhatsAppId, {
        text: "Vous n'êtes pas à l'étape appropriée pour envoyer une image. Veuillez suivre les instructions.",
      });
      await this.sessionService.set(userWhatsAppId, {
        waitingAction: AwaitAction.AWAIT_MAIN_MENU,
      });
    }
  }

  async handleMessage(m: any) {
    const userWhatsAppId = m.key.remoteJid;
    const messageType = Object.keys(m.message)[0];
    var messageText = '';
    var hasMessageText = false;
    if (messageType !== 'imageMessage') {
      messageText = m.message.conversation
        ? m.message.conversation
        : m.message.extendedTextMessage.text;
      hasMessageText = m.message.conversation || m.message.extendedTextMessage;
    }
    // Retrieve current session data from Redis
    const session = await this.sessionService.get(userWhatsAppId);

    // Handle /start command
    if (hasMessageText && messageText === '/start') {
      try {
        const userFound = await this.users.findByWhatsappId(userWhatsAppId);

        if (userFound) {
          if (userFound.step !== 10) {
            await this.socket.sendMessage(m.key.remoteJid!, {
              text:
                `Bon retour ${userFound.name ?? 'cher utilisateur'}` +
                '\nVotre statut actuel est: ' +
                `${userFound.status} 🟠` +
                '\nVotre rôle est: ' +
                `${userFound.role}` +
                '\nComment puis-je vous aider ?' +
                '\n' +
                '\nVeuillez choisir une option pour commencer' +
                `\n> *1.Inscription KYC (continuer à l'étape ${userFound.step}) 🟠*` +
                '\n> *2.Vérification de scoring 🟠*' +
                '\n> *3.Demande de prêt 🟠*' +
                '\n> *------------------*' +
                '\n\n```SIXBot©copyright 2025```',
            });
          } else {
            await this.socket.sendMessage(m.key.remoteJid!, {
              text:
                `Bon retour ${userFound.name ?? 'cher utilisateur'}` +
                '\nVotre statut actuel est: ' +
                `${userFound.status} 🟠` +
                '\nVotre rôle est: ' +
                `${userFound.role}` +
                '\nComment puis-je vous aider ?' +
                '\n' +
                '\nVeuillez choisir une option pour commencer' +
                `\n> *1.Inscription KYC 🟢*` +
                '\n> *2.Vérification de scoring 🟢*' +
                '\n> *3.Demande de prêt 🟢*' +
                '\n> *------------------*' +
                '\n\n```SIXBot©copyright 2025```',
            });
          }
          await this.sessionService.set(userWhatsAppId, {
            phone: userFound.phone,
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text:
              `Bienvenue sur le chatbot Affrikia ${m.pushName}` +
              '\n' +
              "\n Vous n'avez pas de compte avec ce numéro." +
              "\n Nous procédons d'abord à la vérification de ce numéro avant de continuer" +
              '\n*`Vérification du numéro de téléphone`*' +
              '\n\nAvant de commencer, veuillez fournir votre numéro de téléphone au format (224XXXXXXXXX)' +
              '\n\n```SIXBot©copyright 2025```',
          });
          await this.sessionService.set(userWhatsAppId, {
            waitingAction: AwaitAction.AWAIT_PHONE_VERIFICATION,
          });
        }

        return;
      } catch (error) {
        if (error.message === 'User not found') {
          await this.socket.sendMessage(userWhatsAppId!, {
            text:
              `Bienvenue sur le chatbot Afrrikia ${m.pushName}` +
              '\n' +
              "\nVous n'avez pas de compte avec ce numéro." +
              "Nous procédons d'abord à la vérification de ce numéro avant de continuer" +
              '\n\n*`Vérification du numéro de téléphone`*' +
              '\n\nAvant de commencer, veuillez fournir votre numéro de téléphone au format (224XXXXXXXXX)' +
              '\n\n```SIXBot©copyright 2025```',
          });
          await this.sessionService.set(userWhatsAppId, {
            waitingAction: AwaitAction.AWAIT_PHONE_VERIFICATION,
          });
        } else {
          console.log(
            'Erreur lors de la vérification du numéro de téléphone',
            error.message,
          );
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Erreur lors de la vérification du numéro de téléphone, veuillez réessayer plus tard...',
          });
        }
        return;
      }
    }
    //If the user is waiting for a specific action, process accordingly
    if (session.waitingAction) {
      await this.processWaitingAction(m, session);
      return;
    } else {
      console.log('sending message');
      await this.sendMessage(
        userWhatsAppId,
        'Bienvenue sur le chatbot Afrrikia!' +
          `Tapez /start pour commencer une session` +
          '\n\n```SIXBot©copyright 2025```',
      );
      // If no session exists, initialize it
    }
  }

  async sendMessage(jid: string, message: string) {
    if (!this.socket) {
      throw new Error('WhatsApp is not connected!');
    }

    await this.socket.sendMessage(jid, {
      text: message,
    });
  }

  getText(step: number, user?: UserDocument): string {
    switch (step) {
      case 0:
        return (
          `\n> *1. Inscription KYC -- 🔴*` +
          '\n*`ÉTAPE 0`*' +
          '\n\nVeuillez fournir votre numéro de téléphone (224XXXXXXXX)'
        );

      case 1:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 1`*' +
          '\n\nVeuillez fournir le numéro de téléphone de votre référence (224XXXXXXXX)'
        );

      case 2:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 2`*' +
          '\n\nVeuillez fournir votre prénom'
        );

      case 3:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 3`*' +
          '\n\nVeuillez fournir votre nom de famille'
        );

      case 4:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 4`*' +
          '\n\nVeuillez fournir votre date de naissance (jj/mm/aaaa)'
        );

      case 5:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 5`*' +
          '\n\nVeuillez fournir votre adresse'
        );

      case 6:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 6`*' +
          '\n\nVeuillez choisir un rôle. Comment souhaitez-vous être enregistré :' +
          `\n> *1 -- Client*` +
          `\n> *2 -- Agent*`
        );

      case 7:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 7`*' +
          '\n\nVeuillez fournir votre numéro de pièce d’identité'
        );

      case 8:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 8`*' +
          '\n\nVeuillez envoyer une photo de votre carte d’identité'
        );

      case 9:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 9`*' +
          '\n\nVeuillez envoyer une photo de votre carte d’identité avec votre visage'
        );
      case 10:
        return (
          `\n> *1. Inscription KYC -- 🟠*` +
          '\n*`ÉTAPE 10`*' +
          '\n\nVeuillez envoyer une photo de votre visage pour la reconnaissance faciale'
        );

      case 11:
        return (
          `\n> *1. Inscription KYC -- Terminée 🟢*` +
          '\n*`Résumé de votre inscription`*' +
          `\n\n> Numéro de téléphone : ${user?.phone}` +
          `\n> Prénom : ${user?.name}` +
          `\n> Nom : ${user?.surname}` +
          `\n> Date de naissance : ${user?.birthday}` +
          `\n> Adresse : ${user?.address}` +
          `\n> Rôle : ${user?.role}` +
          `\n> Numéro d'identité : ${user?.idNumber}` +
          `\n> Photo carte d'identité : ${user?.idCardPhotoUrl}` +
          `\n> Photo carte + visage : ${user?.idCardFacePhotoUrl}` +
          `\n> Photo de visage : ${user?.facerecognitionData}` +
          `\n\nVotre inscription KYC est maintenant terminée. Vous pouvez commencer à utiliser la plateforme.` +
          '\nTapez ' +
          '*`/start`*' +
          ' pour commencer à utiliser nos services.' +
          '\n\n```SIXBot©copyright 2025```'
        );

      default:
        break;
    }
  }

  async updateField(
    jid: string,
    field: WaitingAction,
    fieldFormatted: string,
    value: string,
    step: number,
  ) {
    await this.socket.sendMessage(jid, {
      text:
        `Votre ${fieldFormatted} : ${value.slice(2).trim()} a été reçu` +
        '\nTraitement... Préparez-vous pour l’étape suivante !',
    });

    const userToUpdate = await this.users.findByWhatsappId(jid);

    if (userToUpdate) {
      if (userToUpdate.step === step - 1) {
        let fieldValue = '';

        if (step === 6) {
          fieldValue =
            value.slice(3).trim() === '1' ? Role.CUSTOMER : Role.AGENT;
        } else {
          fieldValue = value.slice(2).trim();
        }
        const user: UpdateUserDto = {
          [field]: fieldValue,
          step: step,
          status: step === 10 ? Status.ACTIVATED : Status.PENDING,
        };
        const updatedUser = await this.users.update(userToUpdate.id, user);

        if (updatedUser) {
          await this.socket.sendMessage(jid, {
            text: this.getText(step + 1, updatedUser),
          });
          // const user: UpdateUserDto = {
          //   waitingAction: field,
          // };
        } else {
          await this.socket.sendMessage(jid, {
            text: "Nous n'avons pas pu ajouter ce champ. Veuillez réessayer plus tard.",
          });
        }
      } else {
        await this.socket.sendMessage(jid, {
          text: `Vous n'avez pas fourni le champ attendu. Veuillez fournir le champ requis : ${userToUpdate.waitingAction}`,
        });
      }
    } else if (!userToUpdate && step === 0) {
      const userToCreate: CreateUserDto = {
        phone: value.slice(2).trim(),
        step: 0,
        whasappsId: jid,
        status: Status.PENDING,
      };

      const createdUser = await this.users.create(userToCreate);

      if (createdUser) {
        await this.socket.sendMessage(jid, {
          text: this.getText(step + 1),
        });
      } else {
        await this.socket.sendMessage(jid, {
          text: "Nous n'avons pas pu créer l'utilisateur. Veuillez réessayer plus tard.",
        });
      }
    } else if (!userToUpdate && step !== 0) {
      await this.socket.sendMessage(jid, {
        text: 'Utilisateur introuvable. Essayez de vous connecter avec le bon compte WhatsApp.',
      });
      return;
    }
  }

  async updateFieldNew(
    jid: string,
    field: WaitingAction,
    fieldFormatted: string,
    value: string,
    step: number,
  ) {
    await this.socket.sendMessage(jid, {
      text:
        `Votre ${fieldFormatted} : ${value.trim()} a été reçu` +
        '\nTraitement... Préparez-vous pour l’étape suivante !',
    });

    const userToUpdate = await this.users.findByWhatsappId(jid);

    if (userToUpdate) {
      if (userToUpdate.step === step - 1) {
        let fieldValue = '';

        if (step === 6) {
          fieldValue = value.trim() === '1' ? Role.CUSTOMER : Role.AGENT;
        } else {
          fieldValue = value.trim();
        }
        const user: UpdateUserDto = {
          [field]: fieldValue,
          step: step,
          status: step === 10 ? Status.ACTIVATED : Status.PENDING,
        };
        const updatedUser = await this.users.update(userToUpdate.id, user);

        if (updatedUser) {
          await this.socket.sendMessage(jid, {
            text: this.getText(step + 1, updatedUser),
          });
          await this.setNextStep(jid, step + 1);
        } else {
          await this.socket.sendMessage(jid, {
            text: "Nous n'avons pas pu ajouter ce champ. Veuillez réessayer plus tard.",
          });
        }
      } else {
        await this.socket.sendMessage(jid, {
          text: `Vous n'avez pas fourni le champ attendu. Veuillez fournir le champ requis : ${userToUpdate.waitingAction}`,
        });
      }
    } else if (!userToUpdate && step === 0) {
      const userToCreate: CreateUserDto = {
        phone: value.trim(),
        step: 0,
        whasappsId: jid,
        status: Status.PENDING,
      };

      const createdUser = await this.users.create(userToCreate);

      if (createdUser) {
        await this.socket.sendMessage(jid, {
          text: this.getText(step + 1),
        });
        await this.setNextStep(jid, step + 1);
      } else {
        await this.socket.sendMessage(jid, {
          text: "Nous n'avons pas pu créer l'utilisateur. Veuillez réessayer plus tard.",
        });
      }
    } else if (!userToUpdate && step !== 0) {
      await this.socket.sendMessage(jid, {
        text: 'Utilisateur introuvable. Essayez de vous connecter avec le bon compte WhatsApp.',
      });
      return;
    }
  }
  async getAllGroups() {
    if (!this.socket) {
      throw new Error('WhatsApp is not connected!');
    }

    const groups = await this.socket.groupFetchAllParticipating();

    return groups;
  }
  create(createWhatsappAgentDto: CreateWhatsappAgentDto) {
    return 'This action adds a new whatsappAgent';
  }

  findAll() {
    return `This action returns all whatsappAgent`;
  }

  findOne(id: number) {
    return `This action returns a #${id} whatsappAgent`;
  }

  update(id: number, updateWhatsappAgentDto: UpdateWhatsappAgentDto) {
    return `This action updates a #${id} whatsappAgent`;
  }

  remove(id: number) {
    return `This action removes a #${id} whatsappAgent`;
  }

  async setNextStep(userWhasappsId: string, nextStep: number) {
    switch (nextStep) {
      case 0:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_REG_PHONE,
        });
        break;
      case 1:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_REF_PHONE,
        });
        break;
      case 2:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_FIRSTNAME,
        });
        break;
      case 3:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_NAME,
        });
        break;
      case 4:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_BIRTHDATE,
        });
        break;
      case 5:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_ADDRESS,
        });
        break;
      case 6:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_ROLE,
        });
        break;
      case 7:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_ID_NUMBER,
        });
        break;
      case 8:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_IDCARD_IMAGE,
        });
        break;
      case 9:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_IDCARD_AND_FACE_IMAGE,
        });
        break;
      case 10:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_FACE_IMAGE,
        });
        break;
      case 11:
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_RESTART,
        });
        break;
      default:
        break;
    }
  }

  async handleMainMenuOptions(userMessage: string, userWhasappsId: string) {
    if (userMessage === '1') {
      const userFound = await this.users.findByWhatsappId(userWhasappsId!);

      if (userFound) {
        await this.socket.sendMessage(userWhasappsId!!, {
          text: this.getText(userFound.step + 1, userFound),
        });
        await this.setNextStep(userWhasappsId!, userFound.step + 1);
        return;
      } else {
        await this.socket.sendMessage(userWhasappsId!, {
          text: this.getText(0),
        });
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_REG_PHONE,
        });
        return;
      }
    }

    if (userMessage === '2') {
      try {
        const userFound = await this.users.findByWhatsappId(userWhasappsId!);

        if (!userFound) {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Vous devez d’abord vous enregistrer. Veuillez choisir l’option 1 pour commencer le processus d’inscription KYC.',
          });

          return;
        }

        const phoneNumber = userFound.phone;

        const scoringResult =
          await this.scorings.findScoringByUserPhone(phoneNumber);

        await this.socket.sendMessage(userWhasappsId!, {
          text:
            `Le score pour votre numéro de téléphone ${phoneNumber} est: ` +
            `\n\n*${scoringResult.totalScore.toFixed(2)}*` +
            `\n\nN'hesitez pas d'utiliser un autre service (1, 2, 3)` +
            '\nMerci de votre confiance !',
        });
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_MAIN_MENU,
        });
      } catch (error) {
        if (error.message === 'User not found') {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Vous devez d’abord vous enregistrer. Veuillez choisir l’option 1 pour commencer le processus d’inscription KYC.',
          });
        } else if (error.message === 'Scoring not found') {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Aucune donnée de score trouvée pour ce numéro de téléphone.',
          });
        } else {
          console.log('', error);
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Nous n’avons pas pu retrouver votre score. Veuillez réessayer plus tard...',
          });
        }
      }
    }
    if (userMessage === '3') {
      try {
        const userFound = await this.users.findByWhatsappId(userWhasappsId!);

        if (!userFound) {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Vous devez d’abord vous enregistrer. Veuillez choisir l’option 1 pour commencer le processus d’inscription KYC.',
          });

          return;
        }

        const phoneNumber = userFound.phone;

        const scoringResult =
          await this.scorings.findScoringByUserPhone(phoneNumber);

        if (scoringResult.totalScore >= 50) {
          await this.socket.sendMessage(userWhasappsId!, {
            text:
              `Félicitations, votre numéro ${phoneNumber} est éligible à un prêt.` +
              '\n\nVotre score est de : ' +
              `\n> *${scoringResult.totalScore.toFixed(2)}*`,
          });
          await this.socket.sendMessage(userWhasappsId!, {
            text:
              `\n> *3.Demande de prêt -- 🟢*` +
              '\n*Nos Services de prêt*' +
              '\n\nVeuillez choisir un service :' +
              `\n> *1 -- Prêt sur appareil*` +
              `\n> *2 -- Prêt en argent*`,
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_LOAN_REQUEST,
          });
        } else {
          await this.socket.sendMessage(userWhasappsId!, {
            text:
              `Désolé, votre numéro ${phoneNumber} n’est pas éligible à un prêt.` +
              '\n\nVotre score est de : ' +
              `\n> *${scoringResult.totalScore.toFixed(2)}*` +
              `\n\nVeuillez choisir un autre service : 1, 2 ou 3. Merci.`,
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        }
      } catch (error) {
        if (error.message === 'User not found') {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Vous devez d’abord vous enregistrer. Veuillez choisir l’option 1 pour commencer le processus d’inscription KYC.',
          });
        } else if (error.message === 'Scoring not found') {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Aucune donnée de score trouvée pour ce numéro de téléphone.',
          });
        } else {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Nous n’avons pas pu retrouver votre score. Veuillez réessayer plus tard...',
          });
        }
      }
    }
  }

  async handleLoanRequest(userWhasappsId: string, userMessage: string) {
    if (userMessage.trim() === '1') {
      try {
        const userFound = await this.users.findByWhatsappId(userWhasappsId!);
        const userId = new Types.ObjectId(userFound._id as string);
        const loansFound = await this.loans.findByUser(userId);

        if (loansFound.length > 0) {
          const loan = loansFound[0];

          if (loan.status === LoanStatus.INITIATED) {
            await this.socket.sendMessage(userWhasappsId!, {
              text:
                `\n> *3. Demande de prêt -- 🔴*` +
                `\n Vous avez déjà initié une demande de prêt :` +
                `\n*Demandes de prêt disponibles*` +
                `\n ${loan.name}` +
                `\n Statut : ${loan.status} 🟠` +
                `\n Frais d’activation : ${loan.activationFee} GNF` +
                `\n Montant total : ${loan.totalAmount} GNF` +
                `\n\nVeuillez choisir votre mode de remboursement` +
                `\n> *1 -- Mensuel : ${((loan.totalAmount - loan.activationFee) / 4).toFixed(2)} GNF*` +
                `\n> *2 -- Hebdomadaire : ${((loan.totalAmount - loan.activationFee) / 16).toFixed(2)} GNF*` +
                `\nRépondez avec 1 ou 2 pour choisir l’option souhaitée`,
            });
            await this.sessionService.set(userWhasappsId!, {
              waitingAction: AwaitAction.AWAIT_LOAN_TYPE,
            });
          } else if (loan.status === LoanStatus.WAITINGPAYMENT) {
            await this.socket.sendMessage(userWhasappsId!, {
              text:
                `\n> *3. Demande de prêt -- 🟠*` +
                `\n Vous avez déjà une demande de prêt en cours :` +
                `\n*Demandes de prêt disponibles*` +
                `\n ${loan.name}` +
                `\n Statut : ${loan.status} 🟠` +
                `\n Frais d’activation : ${loan.activationFee} GNF` +
                `\n Montant total : ${loan.totalAmount} GNF` +
                `\n Remboursement : ${loan.settlement.type}, en ${loan.settlement.numberOfPayments} paiements` +
                `\n\nChoisissez une action` +
                `\n> *1 -- Initier le paiement des frais d’activation*` +
                `\n> *2 -- Supprimer la demande de prêt*` +
                `\nRépondez avec 1 ou 2 pour effectuer votre choix`,
            });
            await this.sessionService.set(userWhasappsId!, {
              waitingAction: AwaitAction.AWAIT_LOAN_ACTION,
            });
          } else {
            await this.socket.sendMessage(userWhasappsId!, {
              text:
                `\n> *3. Demande de prêt -- 🟠*` +
                `\n Vous avez déjà une demande de prêt :` +
                `\n*Demandes de prêt disponibles*` +
                `\n ${loan.name}` +
                `\n Statut : ${loan.status} 🟢` +
                `\n Frais d’activation : ${loan.activationFee} GNF` +
                `\n Montant total : ${loan.totalAmount} GNF` +
                `\n Remboursement : ${loan.settlement.type}, en ${loan.settlement.numberOfPayments} paiements` +
                `\n Montant payé : ${loan.paidAmount} GNF` +
                `\n\nChoisissez une action` +
                `\n> *1 -- Initier le paiement des frais d’activation*` +
                `\n> *2 -- Supprimer la demande de prêt*` +
                `\nRépondez avec 1 ou 2 pour effectuer votre choix`,
            });
            await this.sessionService.set(userWhasappsId!, {
              waitingAction: AwaitAction.AWAIT_LOAN_ACTION,
            });
          }
        } else {
          const createLoanDto: CreateLoanDto = {
            totalAmount: this.device.price,
            activationFee: this.device.activationFee,
            name: 'Prêt pour appareil',
            description: 'Prêt pour appareil',
            loanType: LoanType.DEVICE,
            status: LoanStatus.INITIATED,
            user: userFound._id as string,
          };

          const createdLoan = await this.loans.create(createLoanDto);

          await this.socket.sendMessage(userWhasappsId!, {
            text:
              `\n> *3. Demande de prêt -- 🔴*` +
              `\n Vous venez d’initier une demande de prêt :` +
              `\n*Demandes de prêt disponibles*` +
              `\n ${createdLoan.name}` +
              `\n Statut : ${createdLoan.status} 🟠` +
              `\n Frais d’activation : ${createdLoan.activationFee} GNF` +
              `\n Montant total : ${createdLoan.totalAmount} GNF` +
              `\n\nVeuillez choisir votre mode de remboursement` +
              `\n> *1 -- Mensuel : ${((createdLoan.totalAmount - createdLoan.activationFee) / 4).toFixed(2)} GNF*` +
              `\n> *2 -- Hebdomadaire : ${((createdLoan.totalAmount - createdLoan.activationFee) / 16).toFixed(2)} GNF*` +
              `\nRépondez avec 1 ou 2 pour choisir l’option souhaitée`,
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_LOAN_TYPE,
          });
        }
      } catch (error) {
        if (error.message === 'User not found') {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Vous devez d’abord vous enregistrer. Veuillez choisir l’option 1 pour commencer le processus de KYC',
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        } else if (error.message === 'Scoring not found') {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Aucun score trouvé pour ce numéro de téléphone. Veuillez choisir un autre menu',
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        } else {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Impossible de récupérer votre score. Veuillez choisir un autre menu',
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        }
      }
    } else if (userMessage.trim() === '2') {
      await this.socket.sendMessage(userWhasappsId!, {
        text: "Ce service n'est pas encore disponible. Merci de choisir un autre service (1)",
      });
    }
  }

  async handleLoanType(userWhasappsId: string, userMessage: string) {
    if (userMessage.trim() === '1' || userMessage.trim() === '2') {
      try {
        const userFound = await this.users.findByWhatsappId(userWhasappsId!);

        const userId = new Types.ObjectId(userFound._id as string);
        const loansFound = await this.loans.findByUser(userId);

        const choice = +userMessage.trim();

        if (loansFound.length > 0) {
          const loan = loansFound[0];

          let echeancier: Settlement;

          if (choice === 1) {
            echeancier = {
              type: SettlementType.MONTHLY,
              numberOfPayments: 4,
            };
          } else if (choice === 2) {
            echeancier = {
              type: SettlementType.WEEKLY,
              numberOfPayments: 16,
            };
          }

          const updateLoanDto: UpdateLoanDto = {
            settlement: echeancier,
            status: LoanStatus.WAITINGPAYMENT,
            paidAmount: 0,
          };

          const loanId = new Types.ObjectId(loan._id as string);
          const updatedLoan = await this.loans.update(loanId, updateLoanDto);

          await this.socket.sendMessage(userWhasappsId!, {
            text:
              `\n> *3. Demande de prêt -- 🟠*` +
              '\n Demande de prêt initiée avec succès : ' +
              '\n*`Demandes de prêt disponibles`*' +
              `\n ${updatedLoan.name}` +
              `\n Statut : ${loan.status} 🟠` +
              `\n Frais d’activation : ${updatedLoan.activationFee} GNF` +
              `\n Montant total : ${updatedLoan.totalAmount} GNF` +
              `\n Montant payé : ${updatedLoan.paidAmount} GNF` +
              `\n Échéancier : ${updateLoanDto.settlement.type}, en ${echeancier.numberOfPayments} paiements` +
              '\n\n Choisissez une action :' +
              `\n> *1 -- Initier le paiement des frais d’activation*` +
              '\nExemple : Répondez par 1 pour choisir l’action souhaitée',
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_LOAN_ACTION,
          });
        } else {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Aucune demande de prêt trouvée. Veuillez initier une demande de prêt d’abord.',
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_LOAN_REQUEST,
          });
        }
      } catch (error) {
        if (error.message === 'User not found') {
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Vous devez d’abord vous enregistrer. Veuillez choisir l’option 1 pour démarrer le processus d’enregistrement KYC.',
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        } else {
          console.log('#########PRÊT', error.message);
          await this.socket.sendMessage(userWhasappsId!, {
            text: 'Nous n’avons pas pu traiter votre demande de prêt. Veuillez réessayer plus tard...',
          });
          await this.sessionService.set(userWhasappsId!, {
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        }
      }
    }
  }

  @OtpVerification()
  async handleLoanAction(context: OtpContext) {
    if (context.userMessage.trim() === '1') {
      await this.socket.sendMessage(context.userWhatsappId!, {
        text: 'Veuillez patienter, le paiement des frais d’activation est en cours...',
      });
      try {
        const userFound = await this.users.findByWhatsappId(
          context.userWhatsappId!,
        );

        const phoneNumber = userFound.phone;
        const userId = new Types.ObjectId(userFound._id as string);
        const loansFound = await this.loans.findByUser(userId);

        if (loansFound.length > 0) {
          const loan = loansFound[0];

          if (loan.status === LoanStatus.WAITINGPAYMENT) {
            const referenceId = uuidv4();
            const data = await this.paymentService.requestPay(
              phoneNumber,
              loan.activationFee,
              referenceId,
            );

            const pendingTransaction: CreateTransactionDto = {
              referenceId: referenceId,
              payerPhone: userFound.phone,
              owner: userFound._id as string,
              status: TransactionStatus.PENDING,
              payerWhatsappId: context.userWhatsappId!,
            };

            if (data) {
              const createdTransaction =
                await this.transactions.create(pendingTransaction);
              const createdTransactionId = new Types.ObjectId(
                createdTransaction._id as string,
              );
              const transactionData =
                await this.paymentService.checkStatus(referenceId);

              console.log('############', transactionData);

              if (transactionData.status === 'SUCCESSFUL') {
                const transaction: CreateTransactionDto = {
                  transactionId: transactionData.financialTransactionId,
                  referenceId: referenceId,
                  externalId: transactionData.externalId,
                  amount: transactionData.amount,
                  currency: transactionData.currency,
                  payerPhone: transactionData.payer.partyId,
                  payerMessage: data.payer_message,
                  payerNote: transactionData.payerNote,
                  owner: userFound._id as string,
                  status: TransactionStatus.SUCCESS,
                };
                const updatedTransaction = await this.transactions.update(
                  createdTransactionId,
                  transaction,
                );
                const response =
                  await this.paymentService.requestActivationCode(userFound);

                if (response.data && response.ok) {
                  const activationCode = response.data;
                  const updateLoanDto: UpdateLoanDto = {
                    status: LoanStatus.ONGOING,
                    paidAmount: loan.activationFee,
                    activationCode: activationCode,
                    activationPaymentDate: new Date(),
                    nextDueDate: new Date(),
                  };

                  const loanId = new Types.ObjectId(loan._id as string);
                  await this.loans.update(loanId, updateLoanDto);

                  await this.socket.sendMessage(context.userWhatsappId!, {
                    text:
                      'Félicitations, votre paiement des frais d’activation a été effectué avec succès. ' +
                      `\n\n> * Voici votre code d’activation : ${activationCode}`,
                  });

                  // Logique pour l'envoi par SMS également
                } else {
                  console.log('############', response.msg);
                  await this.socket.sendMessage(context.userWhatsappId!, {
                    text: "Nous n'avons pas pu retrouver votre code. Veuillez réessayer ou contacter le support client.",
                  });
                }
              } else {
                const failedTransaction: UpdateTransactionDto = {
                  status: TransactionStatus.FAILED,
                };
                const updatedTransaction = await this.transactions.update(
                  createdTransactionId,
                  failedTransaction,
                );
                await this.socket.sendMessage(context.userWhatsappId!, {
                  text: 'Échec du paiement. Veuillez réessayer ou contacter le support client.',
                });
              }
            }
          } else if (loan.status === LoanStatus.INITIATED) {
            await this.socket.sendMessage(context.userWhatsappId!, {
              text:
                `\n> *1. Demande de prêt -- 🟠*` +
                `\nVous avez déjà initié une demande de prêt mais vous n'avez pas encore défini un plan de remboursement.` +
                '\nVeuillez définir un plan de remboursement avant de continuer.',
            });
          }
        } else {
          await this.socket.sendMessage(context.userWhatsappId!, {
            text: `Vous n'avez pas encore effectué de demande de prêt. Veuillez choisir l’option 3 pour commencer une demande.`,
          });
          await this.sessionService.set(context.userWhatsappId!, {
            waitingAction: AwaitAction.AWAIT_LOAN_REQUEST,
          });
        }
      } catch (error) {
        if (error.message === 'User not found') {
          await this.socket.sendMessage(context.userWhatsappId!, {
            text: 'Vous devez d’abord vous enregistrer. Veuillez choisir l’option 1 pour commencer le processus KYC.',
          });
          await this.sessionService.set(context.userWhatsappId!, {
            waitingAction: AwaitAction.AWAIT_MAIN_MENU,
          });
        } else if (error.message === 'Scoring not found') {
          await this.socket.sendMessage(context.userWhatsappId!, {
            text: 'Aucune donnée de scoring trouvée pour ce numéro de téléphone.',
          });
        } else {
          console.log('PAYMMMENT', error.message);
          await this.socket.sendMessage(context.userWhatsappId!, {
            text: "Nous n'avons pas pu initier le paiement. Veuillez réessayer plus tard...",
          });
        }
      }
    }
  }

  @SendOtp()
  async initiateAction(context: OtpContext) {}

  async handlePhoneVerification(userWhasappsId: string, userMessage: string) {
    await this.socket.sendMessage(userWhasappsId!, {
      text:
        'Numéro de téléphone reçu' +
        '\nVérification du numéro de téléphone en cours...',
    });

    try {
      const userFoundOtp = await this.users.generateOTP(userMessage);
      await sendOTP(userMessage, `Votre code OTP est ${userFoundOtp.otp}`);
      await this.socket.sendMessage(userWhasappsId!, {
        text:
          `Un code OTP a été envoyé au numéro de téléphone que vous avez fourni : ${userMessage}` +
          '\nVeuillez le saisir ici comme ceci : O:Code OTP Reçu...',
      });
      await this.sessionService.set(userWhasappsId!, {
        phone: userMessage,
        waitingAction: AwaitAction.AWAIT_OTP,
      });
    } catch (error) {
      console.log('###########', error.message);
      if (error.message === 'User not found') {
        const pinCode = randomInt(100000, 999999);
        console.log(pinCode);
        console.log('Numéro de téléphone :', userMessage);

        await sendOTP(userMessage, `Votre code OTP est ${pinCode}`);
        this.sessionService.set(userWhasappsId!, {
          otp: pinCode.toString(),
        });

        await this.socket.sendMessage(userWhasappsId!, {
          text:
            `Un code OTP a été envoyé au numéro de téléphone que vous avez fourni : ${userMessage}` +
            '\nVeuillez le saisir ici',
        });
        await this.sessionService.set(userWhasappsId!, {
          phone: userMessage,
          waitingAction: AwaitAction.AWAIT_OTP,
        });
      } else {
        console.log(
          'Erreur lors de la vérification du numéro de téléphone',
          error.message,
        );
        await this.socket.sendMessage(userWhasappsId!, {
          text: 'Erreur lors de la vérification du numéro de téléphone, veuillez réessayer plus tard...',
        });
      }
    }
  }

  async handleOtpVerification(userWhasappsId: string, userMessage: string) {
    const session = await this.sessionService.get(userWhasappsId!);

    if (session.otp) {
      const otpMatched = session.otp === userMessage.trim();

      if (otpMatched) {
        await this.socket.sendMessage(userWhasappsId, {
          text:
            `Vous n'avez pas encore de compte` +
            '\n\nVotre statut actuel est : ' +
            `Aucun compte 🔴` +
            '\nComment puis-je vous aider ?' +
            '\n' +
            '\nVeuillez choisir une option pour commencer' +
            '\n> *1. Enregistrement KYC -- 🔴*' +
            '\n\n```SIXBot©copyright 2025```',
        });
        await this.sessionService.set(userWhasappsId, {
          waitingAction: AwaitAction.AWAIT_KYC_REGISTRATION,
        });
        //this.deleteTempUserById(userWhasappsId);
      } else {
        await this.socket.sendMessage(userWhasappsId, {
          text:
            `Le code OTP ne correspond pas, veuillez fournir un code correct.` +
            "\nSi vous n'avez pas reçu le code OTP, veuillez redémarrer le processus pour le renvoyer, tapez /start",
        });
      }
    } else {
      await this.socket.sendMessage(userWhasappsId!, {
        text: 'Aucun code OTP envoyé encore. Veuillez renvoyer votre le code OTP.',
      });
      return;
    }
  }

  async handleKYCRegistration(userWhasappsId: string, userMessage: string) {
    if (userMessage === '1') {
      const userFound = await this.users.findByWhatsappId(userWhasappsId!);

      if (userFound) {
        await this.socket.sendMessage(userWhasappsId!!, {
          text: this.getText(userFound.step + 1, userFound),
        });
        await this.setNextStep(userWhasappsId!, userFound.step + 1);
        return;
      } else {
        await this.socket.sendMessage(userWhasappsId!, {
          text: this.getText(0),
        });
        await this.sessionService.set(userWhasappsId!, {
          waitingAction: AwaitAction.AWAIT_REG_PHONE,
        });
        return;
      }
    }
  }

  async otpGuardHandler(context: OtpContext) {
    const session = await this.sessionService.get(context.userWhatsappId);

    if (session.chachedWaitingAction) {
      switch (session.chachedWaitingAction) {
        case AwaitAction.AWAIT_LOAN_ACTION:
          await this.handleLoanAction(context);

          break;

        default:
          break;
      }
    }
  }

  async processWaitingAction(m: any, session: UserSessionData) {
    const userWhatsAppId = m.key.remoteJid;
    const messageType = Object.keys(m.message)[0];
    var messageText = '';
    var hasMessageText = false;
    if (messageType !== 'imageMessage') {
      messageText = m.message.conversation
        ? m.message.conversation
        : m.message.extendedTextMessage.text;
      hasMessageText = m.message.conversation || m.message.extendedTextMessage;
    }

    switch (session.waitingAction) {
      case AwaitAction.AWAIT_MAIN_MENU:
        // Handle main menu input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_MAIN_MENU, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Option invalide. Veuillez choisir une option valide (1, 2 ou 3).',
            });
            return;
          }
          this.handleMainMenuOptions(messageText, userWhatsAppId);
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;

      case AwaitAction.AWAIT_PHONE_VERIFICATION:
        // Handle phone verification input
        if (hasMessageText) {
          if (
            !this.isValidInput(
              AwaitAction.AWAIT_PHONE_VERIFICATION,
              messageText,
            )
          ) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Le numéro de téléphone non valide. Veuillez entrer un numéro valide (224XXXXXXXXX).',
            });
            return;
          }
          await this.handlePhoneVerification(userWhatsAppId!, messageText);
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;
      case AwaitAction.AWAIT_PHONE:
        // Handle phone number input
        break;

      case AwaitAction.AWAIT_REG_PHONE:
        // Handle registration phone input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_REG_PHONE, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Numéro de téléphone invalide. Veuillez entrer un numéro valide au format (224XXXXXXXXX).',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'phone',
            'Numéro de téléphone',
            messageText,
            0,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;

      case AwaitAction.AWAIT_REF_PHONE:
        // Handle referral phone input

        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_REF_PHONE, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Numéro de téléphone de référence invalide. Veuillez entrer un numéro valide au format (224XXXXXXXXX).',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'refPhone',
            'Numéro de téléphone de référence',
            messageText,
            1,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;

      case AwaitAction.AWAIT_NAME:
        // Handle name input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_NAME, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Nom invalide. Veuillez entrer un nom valide.',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'name',
            'Nom',
            messageText,
            3,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;

      case AwaitAction.AWAIT_FIRSTNAME:
        // Handle surname input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_FIRSTNAME, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Prénom invalide. Veuillez entrer un prénom valide.',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'surname',
            'Prénom',
            messageText,
            2,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;
      case AwaitAction.AWAIT_FACE_IMAGE:
        // Handle surname input
        if (!(messageType === 'imageMessage')) {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez envoyer une image de votre visage pour continuer.',
          });
          return;
        }
        await this.processImageMessage(m);
        break;
      case AwaitAction.AWAIT_IDCARD_IMAGE:
        // Handle surname input
        if (!(messageType === 'imageMessage')) {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: "Veuillez envoyer une image de votre carte d'indentité pour continuer.",
          });
          return;
        }
        await this.processImageMessage(m);
        break;
      case AwaitAction.AWAIT_IDCARD_AND_FACE_IMAGE:
        // Handle surname input
        if (!(messageType === 'imageMessage')) {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: "Veuillez envoyer une image de votre visage avec la carte d'indentité pour continuer.",
          });
          return;
        }
        await this.processImageMessage(m);
        break;
      case AwaitAction.AWAIT_ADDRESS:
        // Handle address input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_ADDRESS, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Adresse invalide. Veuillez entrer une adresse valide.',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'address',
            'Adresse',
            messageText,
            5,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;

      case AwaitAction.AWAIT_ID_NUMBER:
        // Handle ID number input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_ID_NUMBER, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Numéro d’identification invalide. Veuillez entrer un numéro valide.',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'idNumber',
            'Numéro d’identification',
            messageText,
            7,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;
      case AwaitAction.AWAIT_BIRTHDATE:
        // Handle birthdate input

        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_BIRTHDATE, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Date de naissance invalide. Veuillez entrer une date valide au format jj/mm/aaaa.',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'birthday',
            'Date de naissance',
            messageText,
            4,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;

      case AwaitAction.AWAIT_OTP:
        // Handle OTP input
        if (hasMessageText) {
          if (messageText.length !== 6) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Code OTP invalide. Veuillez entrer un code de 6 chiffres.',
            });
            return;
          }
          await this.handleOtpVerification(userWhatsAppId!, messageText);
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;
      case AwaitAction.AWAIT_OTP_GUARD:
        // Handle OTP input
        if (hasMessageText) {
          if (messageText.length !== 6) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Code OTP invalide. Veuillez entrer un code de 6 chiffres.',
            });
            return;
          }
          await this.otpGuardHandler({
            userWhatsappId: userWhatsAppId!,
            userMessage: messageText,
          });
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }

        break;

      case AwaitAction.AWAIT_ROLE:
        // Handle role selection
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_ROLE, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Rôle invalide. Veuillez entrer un rôle valide (1 pour Client, 2 pour Agent).',
            });
            return;
          }
          await this.updateFieldNew(
            userWhatsAppId!,
            'role',
            'Rôle',
            messageText,
            6,
          );
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;

      case AwaitAction.AWAIT_LOAN_REQUEST:
        // Handle loan details input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_LOAN_REQUEST, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Option invalide. Veuillez choisir une option valide (1 pour Prêt sur appareil, 2 pour Prêt en argent).',
            });
            return;
          }
          await this.handleLoanRequest(userWhatsAppId!, messageText);
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;

      case AwaitAction.AWAIT_LOAN_TYPE:
        // Handle loan type selection
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_LOAN_TYPE, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Option invalide. Veuillez choisir une option valide (1 pour Mensuel, 2 pour Hebdomadaire).',
            });
            return;
          }
          await this.handleLoanType(userWhatsAppId!, messageText);
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;
      case AwaitAction.AWAIT_LOAN_ACTION:
        // Handle loan action selection
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_LOAN_ACTION, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Option invalide. Veuillez choisir une option valide (1 pour initier le paiement du prêt).',
            });
            return;
          }
          await this.initiateAction({
            userWhatsappId: userWhatsAppId!,
            userMessage: messageText,
            awaitAction: AwaitAction.AWAIT_LOAN_ACTION,
          });
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;
      case AwaitAction.AWAIT_KYC_REGISTRATION:
        // Handle KYC registration input
        if (hasMessageText) {
          if (
            !this.isValidInput(AwaitAction.AWAIT_KYC_REGISTRATION, messageText)
          ) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Option invalide. Veuillez choisir l’option 1 pour commencer le processus d’inscription KYC.',
            });
            return;
          }
          await this.handleKYCRegistration(userWhatsAppId!, messageText);
        } else {
          await this.socket.sendMessage(userWhatsAppId!, {
            text: 'Veuillez répondre par un message text.',
          });
          return;
        }
        break;
      case AwaitAction.AWAIT_RESTART:
        // Handle restart input
        if (hasMessageText) {
          if (!this.isValidInput(AwaitAction.AWAIT_RESTART, messageText)) {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Veuillez tapez /start pour commencer une session',
            });
            return;
          } else {
            await this.socket.sendMessage(userWhatsAppId!, {
              text: 'Veuillez répondre par un message text.',
            });
            return;
          }
        }
        break;
      case AwaitAction.AWAIT_PAYMENT:
        // Handle payment details input
        break;

      case AwaitAction.AWAIT_USER:
        // Handle user info confirmation/input
        break;

      case AwaitAction.AWAIT_MOMO:
        // Handle MoMo (Mobile Money) transaction/input
        break;

      default:
        console.warn('Unhandled AwaitAction:');
    }
  }

  isValidInput(action: AwaitAction, input: string): boolean {
    const regex = AwaitActionRegexMap[action];
    return regex.test(input);
  }
  async onModuleDestroy() {
    this.socket?.close();
  }
}
