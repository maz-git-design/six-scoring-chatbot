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

  constructor(
    private readonly users: UsersService,
    private readonly scorings: ScoringsService,
    private readonly loans: LoansService,
    private readonly transactions: TransactionsService,
    private readonly paymentService: PaymentService,
  ) {}

  isDifferenceAtLeast10Minutes(date1: string, date2: string) {
    const diffInMs = Math.abs(
      new Date(date1).getTime() - new Date(date2).getTime(),
    ); // Get absolute difference in milliseconds
    const diffInMinutes = diffInMs / (1000 * 60); // Convert to minutes
    return diffInMinutes >= 10; // Check if at least 10 minutes
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    const dateNow = new Date();

    try {
      const loans = await this.loans.findByStatus(LoanStatus.ONGOING);

      // loans.forEach((loan) => {
      //   const las
      // });

      console.log('ICI');
    } catch (error) {}
  }

  async onModuleInit() {
    this.connectToWhatsApp();
    this.getTempUsers();
    // sendOTP('243892007346', 'Your OTP is 123456');
  }

  getTempUsers() {
    const dirPath = path.dirname(tempUsersFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true }); // Create temp directory
    }
    if (fs.existsSync(dirPath)) {
      const rawData = fs.readFileSync(tempUsersFilePath, 'utf8');
      console.log('Row data', rawData);

      if (rawData) {
        this.tempUsersJson = JSON.parse(rawData);
      }
    }
  }

  addTempUser(tempUser: TempUser, write: boolean = true) {
    const exists = this.tempUsersJson.some(
      (user) => user.whassappsId === tempUser.whassappsId,
    );

    if (exists) {
      console.log(`⚠️ User with phone ${tempUser.whassappsId} already exists.`);
      return;
    }

    // Add a new regex pattern
    this.tempUsersJson.push(tempUser);

    // Convert back to JSON and write to file
    if (write)
      fs.writeFileSync(
        tempUsersFilePath,
        JSON.stringify(this.tempUsersJson, null, 2),
        'utf8',
      );
  }

  isTempUserExist(tempUser: TempUser) {
    const exists = this.tempUsersJson.some(
      (user) => user.whassappsId === tempUser.whassappsId,
    );

    return exists;
  }

  deleteTempUserById(whatsappId: string, write: boolean = true) {
    if (!fs.existsSync(tempUsersFilePath)) {
      console.log('⚠️ File does not exist.');
      return;
    }

    // 2️⃣ Filter out the user by ID
    const updatedUsers = this.tempUsersJson.filter(
      (user) => user.whassappsId !== whatsappId,
    );

    // 3️⃣ Write back the updated JSON
    if (write)
      fs.writeFileSync(
        tempUsersFilePath,
        JSON.stringify(updatedUsers, null, 2),
        'utf8',
      );

    console.log(`✅ User with ID ${whatsappId} deleted successfully.`);
  }

  getTempUserById(whatsappId: string) {
    // 2️⃣ Filter out the user by ID
    const updatedUser = this.tempUsersJson.filter(
      (user) => user.whassappsId == whatsappId,
    );

    return updatedUser.length > 0 ? updatedUser[0] : null;
  }

  getTempUserByIdForPay(whatsappId: string) {
    const tUser = this.getTempUserById(whatsappId);

    if (!tUser) {
      return null;
    }

    // Check if phoneForPay is available
    if (tUser.phoneForPay) {
      return tUser;
    } else {
      return null;
    }
  }

  updateTempUser(tempUser: TempUser, write: boolean = true) {
    // Ensure `this.tempUsersJson` is initialized
    if (!this.tempUsersJson) {
      this.tempUsersJson = [];
    }

    // Find index of the existing user
    const index = this.tempUsersJson.findIndex(
      (user) => user.whassappsId === tempUser.whassappsId,
    );

    if (index !== -1) {
      // Update existing user
      this.tempUsersJson[index] = { ...this.tempUsersJson[index], ...tempUser };
      // Convert back to JSON and write to file

      console.log('hamamma', this.tempUsersJson[index]);
      if (write)
        fs.writeFileSync(
          tempUsersFilePath,
          JSON.stringify(this.tempUsersJson, null, 2),
          'utf8',
        );
      console.log(`✅ User updated:`, this.tempUsersJson[index]);
    } else {
      console.log(`⚠️ User with whatsapp ${tempUser.whassappsId} not found.`);
    }
  }

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
    this.socket.ev.on('messages.upsert', async ({ messages }) => {
      const m = messages[0];

      console.log('User message:', messages);
      console.log('Message', m.message.extendedTextMessage);

      if (!m.message) return; // if there is no text or media message
      const messageType = Object.keys(m.message)[0]; // get what type of message it is -- text, image, video
      const phoneregex = /^224\d{9}$/;
      const regphoneregex = /^P:224\d{9}$/;
      const refphoneregex = /^R:224\d{9}$/;
      const nameregex = /^N:\s*[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
      const surnameregex = /^S:\s*[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
      const addressregex = /^A:\s*.+$/;
      const idNumberregex = /^I:\s*\d+$/;
      const birthdateregex = /^B:\d{2}\/\d{2}\/\d{4}$/;
      const otpregex = /^O:\s*\d{6}$/;
      const roleregex = /^RO:\s*[0-9]$/;
      const loanregex = /^L:\s*[0-9]$/;
      const payregex = /^P:\s*[0-9]$/;
      const userregex = /^U:224\d{9}$/;
      const momoregex = /^M:224\d{9}$/;

      if (m.message.conversation || m.message.extendedTextMessage) {
        const userMessage = m.message.conversation
          ? m.message.conversation
          : m.message.extendedTextMessage.text;
        const userWhasappsId = m.key.remoteJid;

        console.log('User message2:', userMessage);
        if (userMessage === '/start') {
          await this.socket.sendMessage(userWhasappsId!, {
            text:
              `Welcome to Affrikia chatbot ${m.pushName}` +
              '\n' +
              '\n*`Phone number verification`*' +
              '\n\nBefore starting, please provide your phone number like (224)(9 digits)' +
              '\nExample: 224123456789' +
              '\n\n```SIXBot©copyright 2025```',
          });

          return;
        }

        if (phoneregex.test(userMessage) || userMessage === '243892007346') {
          await this.socket.sendMessage(userWhasappsId!, {
            text:
              'Phone number received' +
              '\nWaiting for phone number verification...',
          });

          try {
            const userFoundOtp = await this.users.generateOTP(userMessage);
            await sendOTP(userMessage, `Your OTP is ${userFoundOtp.otp}`);
            await this.socket.sendMessage(userWhasappsId!, {
              text:
                `An OTP code where send to the phone number you provided ${userMessage}` +
                '\nPlease put it here like this O:OTP Received...' +
                '\nExample: O:123456',
            });
          } catch (error) {
            console.log('###########', error.message);
            if (error.message === 'User not found') {
              const pinCode = randomInt(100000, 999999);
              console.log(pinCode);
              console.log('Phone number:', userMessage);
              const tempUser: TempUser = {
                phone: userMessage,
                otp: pinCode.toString(),
                whassappsId: userWhasappsId!,
              };

              await sendOTP(userMessage, `Your OTP is ${pinCode}`);
              if (this.isTempUserExist(tempUser)) {
                this.updateTempUser(tempUser);
              } else {
                this.addTempUser(tempUser);
              }

              await this.socket.sendMessage(userWhasappsId!, {
                text:
                  `An OTP code where send to the phone number you provided ${userMessage}` +
                  '\nPlease put it here like this O:OTP Received...' +
                  '\nExample: O:123456',
              });
            } else {
              console.log('Error verifying phone number', error.message);
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'Error verifying phone number, try again later...',
              });
            }
          }
        }

        if (otpregex.test(userMessage)) {
          try {
            const userFound = await this.users.verifyOtp(
              userWhasappsId,
              userMessage.slice(2),
            );

            if (userFound.step !== 10) {
              await this.socket.sendMessage(m.key.remoteJid!, {
                text:
                  `Welcome back ${userFound.name ?? 'Dear User'}` +
                  '\nYour current status is: ' +
                  `${userFound.status} 🟠` +
                  '\nYour role is: ' +
                  `${userFound.role} 🟠` +
                  '\nHow can I help you ?' +
                  '\n' +
                  '\nPlease choose an option to start' +
                  `\n> *1.KYC Registration (continue step ${userFound.step}) -- 🟠*` +
                  '\n> *2.Scoring Verification 🟢*' +
                  '\n> *3.Loan Request*' +
                  '\n> *------------------*' +
                  '\n> *4.Pay a settlement for me*' +
                  '\n> *5.Pay a settlement for other*' +
                  '\n\n```SIXBot©copyright 2025```',
              });
            } else {
              await this.socket.sendMessage(m.key.remoteJid!, {
                text:
                  `Welcome back ${userFound.name ?? 'Dear User'}` +
                  '\nYour current status is: ' +
                  `${userFound.status} 🟢` +
                  '\nYour role is: ' +
                  `${userFound.role} 🟠` +
                  '\nHow can I help you ?' +
                  '\n' +
                  '\nPlease choose an option to start' +
                  `\n> *1.KYC Registration -- 🟢*` +
                  '\n> *2.Scoring Verification -- 🟢*' +
                  '\n> *3.Loan Request -- 🟢*' +
                  '\n> *------------------*' +
                  '\n> *4.Pay a settlement for me*' +
                  '\n> *5.Pay a settlement for other*' +
                  '\n\n```SIXBot©copyright 2025```',
              });
            }
            const user: UpdateUserDto = {
              waitingAction: 'choosingMenu',
            };
            await this.users.update(userFound.id, user);

            return;
          } catch (error) {
            if (error.message === 'User not found') {
              const tempUser = this.tempUsersJson.find(
                (tempUser) => tempUser.whassappsId === userWhasappsId,
              );

              if (tempUser) {
                const otpMatched = tempUser.otp === userMessage.slice(2);

                if (otpMatched) {
                  await this.socket.sendMessage(userWhasappsId, {
                    text:
                      `You don't have an account yet` +
                      '\n\nYour current status is: ' +
                      `No account 🔴` +
                      '\nHow can I help you ?' +
                      '\n' +
                      '\nPlease choose an option to start' +
                      '\n> *1.KYC Registration -- 🔴*' +
                      '\n\n```SIXBot©copyright 2025```',
                  });
                  this.deleteTempUserById(userWhasappsId);
                } else {
                  await this.socket.sendMessage(userWhasappsId, {
                    text:
                      `OTP doesn't match, please provide a correct otp.` +
                      "\nIf you didn't receive the OTP code, please restart the process to send again",
                  });
                }
              } else {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: "Sorry, We weren't able to find your account. Please try again",
                });
              }
            } else if (error.message === 'OTP is not correct') {
              await this.socket.sendMessage(userWhasappsId, {
                text:
                  `OTP doesn't match, please provide a correct otp.` +
                  "\nIf you didn't receive the OTP code, please restart the process to send again",
              });
            } else {
              console.log('Error verifying phone number', error.message);
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'Error verifying phone number, try again later...',
              });
            }

            return;
          }
        }

        if (userMessage === '1') {
          const userFound = await this.users.findByWhatsappId(userWhasappsId!);

          if (userFound) {
            await this.socket.sendMessage(userWhasappsId!!, {
              text: this.getText(userFound.step + 1, userFound),
            });
            return;
          } else {
            await this.socket.sendMessage(userWhasappsId!, {
              text: this.getText(0),
            });

            return;
          }
        }

        if (userMessage === '2') {
          try {
            const userFound = await this.users.findByWhatsappId(
              userWhasappsId!,
            );

            const phoneNumber = userFound.phone;

            const scoringResult =
              await this.scorings.findScoringByUserPhone(phoneNumber);

            await this.socket.sendMessage(userWhasappsId!, {
              text:
                `The scoring for your phone number ${phoneNumber} is: ` +
                `\n\n*${scoringResult.totalScore.toFixed(2)}*` +
                `\n\nDon't hesitate to use another service` +
                '\nThank you',
            });
          } catch (error) {
            if (error.message === 'User not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
              });
            } else if (error.message === 'Scoring not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'No scoring data found for this phone number',
              });
            } else {
              console.log('AAAAA', error);
              await this.socket.sendMessage(userWhasappsId!, {
                text: "We weren't able to find your scoring. Please, try later...",
              });
            }
          }
        }
        if (userMessage === '3') {
          try {
            const userFound = await this.users.findByWhatsappId(
              userWhasappsId!,
            );

            const phoneNumber = userFound.phone;

            const scoringResult =
              await this.scorings.findScoringByUserPhone(phoneNumber);

            if (scoringResult.totalScore >= 50) {
              await this.socket.sendMessage(userWhasappsId!, {
                text:
                  `Congratulations your phone number ${phoneNumber} is eligible for Loans ` +
                  '\n\nYour score is ' +
                  `\n> *${scoringResult.totalScore.toFixed(2)}*`,
              });
              await this.socket.sendMessage(userWhasappsId!, {
                text:
                  `\n> *3.Loan Request -- 🟢*` +
                  '\n*`Available services`*' +
                  '\n\nPlease choose a service:' +
                  `\n> *L:1 -- Loan on Device*` +
                  `\n> *L:2 -- Loan on Money*` +
                  '\nExample:Reply by L:1 or L:2 to choose the right service',
              });
            } else {
              await this.socket.sendMessage(userWhasappsId!, {
                text:
                  `Sorry your phone number ${phoneNumber} is not eligible for Loans ` +
                  '\n\nYour score is ' +
                  `\n> *${scoringResult.totalScore.toFixed(2)}*` +
                  `\n\nPlease, choose another service: 1,2 or 3. Thank you`,
              });
            }
          } catch (error) {
            if (error.message === 'User not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
              });
            } else if (error.message === 'Scoring not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'No scoring data found for this phone number',
              });
            } else {
              await this.socket.sendMessage(userWhasappsId!, {
                text: "We weren't able to find your scoring. Please, try later...",
              });
            }
          }
        }

        if (userMessage === '4') {
          try {
            const userFound = await this.users.findByWhatsappId(
              userWhasappsId!,
            );

            const phoneNumber = userFound.phone;

            const userId = new Types.ObjectId(userFound._id as string);
            const loansFound = await this.loans.findByUser(userId);

            const loan = loansFound[0];

            await this.socket.sendMessage(userWhasappsId!, {
              text:
                `\n> *4.Pay a settlement *` +
                '\n*`Available loan requests`*' +
                `\n ${loan.name}` +
                `\n Status: ${loan.status} 🟠` +
                `\n Activation Fee: ${loan.activationFee} GNF` +
                `\n Total Amount: ${loan.totalAmount} GNF` +
                `\n Paid Amount: ${loan.paidAmount} GNF` +
                `\n Settlement: ${loan.settlement.type} , as ${loan.settlement.numberOfPayments} payments` +
                `\n Remaining settlements: ${loan.settlement.numberOfPayments - loan.settlementCounter} , as ${loan.settlement.numberOfPayments} payments` +
                '\n\n Choose a method of payment' +
                `\n> *P:1 -- Use your phone ${phoneNumber} as a Momo payer*` +
                `\n> *P:2 -- Use another phone as a Momo payer*` +
                '\nExample:Reply by P:1  the right action',
            });
          } catch (error) {
            if (error.message === 'User not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
              });
            } else if (error.message === 'Scoring not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'No scoring data found for this phone number',
              });
            } else {
              await this.socket.sendMessage(userWhasappsId!, {
                text: "We weren't able to find your initiated loan. Please, try later...",
              });
            }
          }
        }

        if (userMessage === '5') {
          const tempUser: TempUser = { whassappsId: userWhasappsId! };

          this.addTempUser(tempUser, false);

          await this.socket.sendMessage(userWhasappsId!, {
            text:
              `\n> *4.Pay a settlement for other*` +
              `\nPlease, provide the phone number of the user like this U:phone ` +
              '\nExample:U:224783456780',
          });
        }

        if (userregex.test(userMessage)) {
          try {
            const phoneNumber = userMessage.slice(2).trim();
            const userFound = await this.users.findByPhone(phoneNumber);

            const userId = new Types.ObjectId(userFound._id as string);
            const loansFound = await this.loans.findByUser(userId);

            const loan = loansFound[0];

            var tUser: TempUser = {
              phoneForPay: phoneNumber,
              whassappsId: userWhasappsId,
            };

            this.updateTempUser(tUser);

            await this.socket.sendMessage(userWhasappsId!, {
              text:
                `\n> *5.Pay a settlement for other*` +
                '\n*`Available loan requests`*' +
                `\n ${loan.name}` +
                `\n Status: ${loan.status} 🟠` +
                `\n Activation Fee: ${loan.activationFee} GNF` +
                `\n Total Amount: ${loan.totalAmount} GNF` +
                `\n Paid Amount: ${loan.paidAmount} GNF` +
                `\n Settlement: ${loan.settlement.type} , as ${loan.settlement.numberOfPayments} payments` +
                `\n Remaining settlements: ${loan.settlement.numberOfPayments - loan.settlementCounter} , as ${loan.settlement.numberOfPayments} payments` +
                '\n\n Choose a method of payment' +
                `\n> *P:1 -- Use your phone ${phoneNumber} as a Momo payer*` +
                `\n> *P:2 -- Use another phone as a Momo payer*` +
                '\nExample:Reply by P:1  the right action',
            });
          } catch (error) {
            if (error.message === 'User not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'You need to use a registered user. Please, provide a phone number of an existing user==',
              });
            } else if (error.message === 'Scoring not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'No scoring data found for this phone number',
              });
            } else {
              await this.socket.sendMessage(userWhasappsId!, {
                text: "We weren't able to find your initiated loan. Please, try later...",
              });
            }
          }
        }

        if (loanregex.test(userMessage)) {
          if (userMessage.slice(2).trim() === '1') {
            try {
              const userFound = await this.users.findByWhatsappId(
                userWhasappsId!,
              );

              const phoneNumber = userFound.phone;

              const userId = new Types.ObjectId(userFound._id as string);
              const loansFound = await this.loans.findByUser(userId);

              if (loansFound.length > 0) {
                const loan = loansFound[0];

                if (loan.status === LoanStatus.INITIATED) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text:
                      `\n> *3.Loan Request -- 🔴*` +
                      '\n You already initiated a loan request: ' +
                      '\n*`Available loan requests`*' +
                      `\n ${loan.name}` +
                      `\n Status: ${loan.status} 🟠` +
                      `\n Activation Fee: ${loan.activationFee} GNF` +
                      `\n Total Amount: ${loan.totalAmount} GNF` +
                      '\n\nPlease choose your settlement' +
                      `\n> *L:4 -- Monthly: ${((loan.totalAmount - loan.activationFee) / 4).toFixed(2)} GNF*` +
                      `\n> *L:5 -- BiWeekly: ${((loan.totalAmount - loan.activationFee) / 8).toFixed(2)} GNF*` +
                      `\n> *L:6 -- Weekly: ${((loan.totalAmount - loan.activationFee) / 16).toFixed(2)} GNF*` +
                      '\nExample:Reply by L:4, L:5 or L:6 to choose the right settlement',
                  });
                } else if (loan.status === LoanStatus.WAITINGPAYMENT) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text:
                      `\n> *3.Loan Request -- 🟠*` +
                      '\n You already started a loan request: ' +
                      '\n*`Available loan requests`*' +
                      `\n ${loan.name}` +
                      `\n Status: ${loan.status} 🟠` +
                      `\n Activation Fee: ${loan.activationFee} GNF` +
                      `\n Total Amount: ${loan.totalAmount} GNF` +
                      `\n Settlement: ${loan.settlement.type} , as ${loan.settlement.numberOfPayments} payments` +
                      '\n\n Choose an action' +
                      `\n> *L:7 -- Initiate the payment of the activation fee*` +
                      `\n> *L:8 -- Delete the loan request*` +
                      '\nExample:Reply by L:7 or L:8 to choose the right action',
                  });
                } else {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text:
                      `\n> *3.Loan Request -- 🟠*` +
                      '\n You already started a loan request: ' +
                      '\n*`Available loan requests`*' +
                      `\n ${loansFound[0].name}` +
                      `\n Status: ${loan.status} 🟢` +
                      `\n Activation Fee: ${loan.activationFee} GNF` +
                      `\n Total Amount: ${loan.totalAmount} GNF` +
                      `\n Settlement: ${loan.settlement.type} , as ${loan.settlement.numberOfPayments} payments` +
                      `\n Paid Amount: ${loan.paidAmount} GNF` +
                      '\n\n Choose an action' +
                      `\n> *L:7 -- Initiate the payment of the activation fee*` +
                      `\n> *L:8 -- Delete the loan request*` +
                      '\nExample:Reply by L:7 or L:8 to choose the right action',
                  });
                }
              } else {
                const createLoanDto: CreateLoanDto = {
                  totalAmount: 5000,
                  activationFee: 1000,
                  name: 'Loan for Device',
                  description: 'Loan for Device',
                  loanType: LoanType.DEVICE,
                  status: LoanStatus.INITIATED,
                  user: userFound._id as string,
                };

                const createdLoan = await this.loans.create(createLoanDto);

                await this.socket.sendMessage(userWhasappsId!, {
                  text:
                    `\n> *3.Loan Request -- 🔴*` +
                    '\n You already initiated a loan request: ' +
                    '\n*`Available loan requests`*' +
                    `\n ${createdLoan.name}` +
                    `\n Status: ${createdLoan.status} 🟠` +
                    `\n Activation Fee: ${createdLoan.activationFee} GNF` +
                    `\n Total Amount: ${createdLoan.totalAmount} GNF` +
                    '\n\nPlease choose your settlement' +
                    `\n> *L:4 -- Monthly: ${((createdLoan.totalAmount - createdLoan.activationFee) / 4).toFixed(2)} GNF*` +
                    `\n> *L:5 -- BiWeekly: ${((createdLoan.totalAmount - createdLoan.activationFee) / 8).toFixed(2)} GNF*` +
                    `\n> *L:6 -- Weekly: ${((createdLoan.totalAmount - createdLoan.activationFee) / 16).toFixed(2)} GNF*` +
                    '\nExample:Reply by L:4, L:5 or L:6 to choose the right settlement',
                });
              }
            } catch (error) {
              if (error.message === 'User not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
                });
              } else if (error.message === 'Scoring not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'No scoring data found for this phone number',
                });
              } else {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: "We weren't able to find your scoring. Please, try later...",
                });
              }
            }
          }
          if (userMessage.slice(2).trim() === '3') {
            try {
              const userFound = await this.users.findByWhatsappId(
                userWhasappsId!,
              );

              const phoneNumber = userFound.phone;

              const deviceCost = 1000;

              await this.socket.sendMessage(userWhasappsId!, {
                text:
                  `\n> *1.Loan Request -- 🟢*` +
                  '\n*`Loan on a Device`*' +
                  `\n\nHere is the cost of the device: ` +
                  `\n*${deviceCost} GNF*` +
                  '\n\nPlease choose your settlement' +
                  `\n> *L:4 -- Monthly: ${(deviceCost / 4).toFixed(2)} GNF*` +
                  `\n> *L:5 -- BiWeekly: ${(deviceCost / 8).toFixed(2)} GNF*` +
                  `\n> *L:6 -- Weekly: ${(deviceCost / 16).toFixed(2)} GNF*` +
                  '\nExample:Reply by L:4, L:5 or L:6 to choose the right settlement',
              });
            } catch (error) {
              if (error.message === 'User not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
                });
              } else {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: "We weren't able to find user details. Please, try later...",
                });
              }
            }
          }
          if (
            userMessage.slice(2).trim() === '4' ||
            userMessage.slice(2).trim() === '5' ||
            userMessage.slice(2).trim() === '6'
          ) {
            try {
              const userFound = await this.users.findByWhatsappId(
                userWhasappsId!,
              );

              const phoneNumber = userFound.phone;

              const userId = new Types.ObjectId(userFound._id as string);
              const loansFound = await this.loans.findByUser(userId);

              const choose = +userMessage.slice(2).trim();

              if (loansFound.length > 0) {
                const loan = loansFound[0];

                let settlement: Settlement;

                if (choose === 4) {
                  settlement = {
                    type: SettlementType.MONTHLY,
                    numberOfPayments: 4,
                  };
                } else if (choose === 5) {
                  settlement = {
                    type: SettlementType.BIWEEKLY,
                    numberOfPayments: 8,
                  };
                } else if (choose === 6) {
                  settlement = {
                    type: SettlementType.WEEKLY,
                    numberOfPayments: 16,
                  };
                }
                const updateLoanDto: UpdateLoanDto = {
                  settlement: settlement,
                  status: LoanStatus.WAITINGPAYMENT,
                  paidAmount: 0,
                };
                const loanId = new Types.ObjectId(loan._id as string);
                const updatedLoan = await this.loans.update(
                  loanId,
                  updateLoanDto,
                );

                await this.socket.sendMessage(userWhasappsId!, {
                  text:
                    `\n> *3.Loan Request -- 🟠*` +
                    '\n Loan request successfully initiated: ' +
                    '\n*`Available loan requests`*' +
                    `\n ${updatedLoan.name}` +
                    `\n Status: ${loan.status} 🟠` +
                    `\n Activation Fee: ${updatedLoan.activationFee} GNF` +
                    `\n Total Amount: ${updatedLoan.totalAmount} GNF` +
                    `\n Paid Amount: ${updatedLoan.paidAmount} GNF` +
                    `\n Settlement: ${updateLoanDto.settlement.type} , as ${updatedLoan.settlement.numberOfPayments} payments` +
                    '\n\n Choose an action' +
                    `\n> *L:7 -- Initiate the payment of the activation fee*` +
                    `\n> *L:8 -- Delete the loan request*` +
                    '\nExample:Reply by L:7 or L:8 to choose the right action',
                });
              } else {
                // const createLoanDto: CreateLoanDto = {
                //   loanType: LoanType.DEVICE,
                //   user: userFound._id as string,
                //   status: LoanStatus.INITIATED,
                // }
              }
            } catch (error) {
              if (error.message === 'User not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
                });
              } else {
                console.log('#########LOAN', error.message);
                await this.socket.sendMessage(userWhasappsId!, {
                  text: "We weren't able to proceed with loan request. Please, try later...",
                });
              }
            }
          }
          if (userMessage.slice(2).trim() === '7') {
            await this.socket.sendMessage(userWhasappsId!, {
              text: 'Wait the payment of the activation fee is in progress...',
            });
            try {
              const userFound = await this.users.findByWhatsappId(
                userWhasappsId!,
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
                    payerWhatsappId: userWhasappsId!,
                  };

                  //const userId = new Types.ObjectId(userFound._id as string);

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
                        await this.paymentService.requestActivationCode(
                          userFound,
                        );

                      if (response.data && response.ok) {
                        const activationCode = response.data;
                        const updateLoanDto: UpdateLoanDto = {
                          status: LoanStatus.ONGOING,
                          paidAmount: loan.activationFee,
                          activationCode: activationCode,
                        };

                        const loanId = new Types.ObjectId(loan._id as string);
                        await this.loans.update(loanId, updateLoanDto);

                        await this.socket.sendMessage(userWhasappsId!, {
                          text:
                            'Congratulations, your payment for activation fee was successful. ' +
                            `\n\n> * This is your activation code: ${activationCode}`,
                        });

                        /// Logique to send it by SMS too
                      } else {
                        console.log('############', response.msg);
                        await this.socket.sendMessage(userWhasappsId!, {
                          text: 'We cannot find your code . Please, try again or contact the customer support',
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
                      await this.socket.sendMessage(userWhasappsId!, {
                        text: 'Payment failed. Please, try again or contact the customer support',
                      });
                    }
                    //const createdTransaction = await this.transactions.create()
                  }
                } else if (loan.status === LoanStatus.INITIATED) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text:
                      `\n> *1.Loan Request -- 🟠*` +
                      `\nYou already started a loan request but you didn't set a settlement ` +
                      '\nPlease set a settlement before proceeding',
                  });
                }
              } else {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: `You don't have a loan request yet. Please, choose option 3 to start a loan request`,
                });
              }
            } catch (error) {
              if (error.message === 'User not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
                });
              } else if (error.message === 'Scoring not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'No scoring data found for this phone number',
                });
              } else {
                console.log('PAYMMMENT', error.message);
                await this.socket.sendMessage(userWhasappsId!, {
                  text: "We weren't able to initiate a payment. Please, try later...",
                });
              }
            }
          }
        }

        if (payregex.test(userMessage)) {
          if (userMessage.slice(2).trim() === '1') {
            await this.socket.sendMessage(userWhasappsId!, {
              text: 'Wait the payment of the settlement is in progress...',
            });
            try {
              var userFound;

              const tUser = this.getTempUserByIdForPay(userWhasappsId!);

              if (!tUser) {
                userFound = await this.users.findByWhatsappId(userWhasappsId!);
              } else {
                userFound = await this.users.findByPhone(tUser.phoneForPay);
              }

              const phoneNumber = userFound.phone;

              const userId = new Types.ObjectId(userFound._id as string);
              const loansFound = await this.loans.findByUser(userFound._id);

              if (loansFound.length > 0) {
                const loan = loansFound[0];

                if (loan.status === LoanStatus.ONGOING) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text: `We will proceed to the payment of the ${loan.settlementCounter + 1}th settlement...`,
                  });
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
                    payerWhatsappId: userWhasappsId!,
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

                      // send update to summy app with new transaction details
                      // const response =
                      //   await this.paymentService.requestActivationCode(
                      //     userFound,
                      //   );

                      const updateLoanDto: UpdateLoanDto = {
                        status:
                          loan.settlement.numberOfPayments ===
                          loan.settlementCounter + 1
                            ? LoanStatus.PAID
                            : LoanStatus.ONGOING,
                        paidAmount: loan.paidAmount + transactionData.amount,
                        settlementCounter: loan.settlementCounter + 1,
                      };

                      const loanId = new Types.ObjectId(loan._id as string);
                      await this.loans.update(loanId, updateLoanDto);

                      await this.socket.sendMessage(userWhasappsId!, {
                        text: `Congratulations, your payment of the ${updateLoanDto.settlementCounter} was successful.`,
                      });
                    } else {
                      const failedTransaction: UpdateTransactionDto = {
                        status: TransactionStatus.FAILED,
                      };
                      const updatedTransaction = await this.transactions.update(
                        createdTransactionId,
                        failedTransaction,
                      );
                      await this.socket.sendMessage(userWhasappsId!, {
                        text: 'Payment failed. Please, try again or contact the customer support',
                      });
                    }
                    //const createdTransaction = await this.transactions.create()
                  }
                }
                if (loan.status === LoanStatus.WAITINGPAYMENT) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text: 'You should first pay the activation fee before proceeding to the the payement of the settlement',
                  });
                } else if (loan.status === LoanStatus.INITIATED) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text:
                      `\n> *4.Pay settlement -- 🟠*` +
                      `\nYou already started a loan request but you didn't set a settlement yet ` +
                      '\nPlease set a settlement before proceeding to the activation fee payment',
                  });
                } else if (loan.status === LoanStatus.PAID) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text: `You already paid all your settlement amounts.`,
                  });
                }
              } else {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: `You don't have a loan request yet. Please, choose option 3 to start a loan request`,
                });
              }
            } catch (error) {
              if (error.message === 'User not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
                });
              } else if (error.message === 'Scoring not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'No scoring data found for this phone number',
                });
              } else {
                console.log('PAYMMMENT', error.message);
                await this.socket.sendMessage(userWhasappsId!, {
                  text: "We weren't able to initiate a payment. Please, try later...",
                });
              }
            }
          }
          if (userMessage.slice(2).trim() === '2') {
            try {
              var userFound;

              const tUser = this.getTempUserByIdForPay(userWhasappsId!);

              if (!tUser) {
                userFound = await this.users.findByWhatsappId(userWhasappsId!);
              } else {
                userFound = await this.users.findByPhone(tUser.phoneForPay);
              }

              const phoneNumber = userFound.phone;

              const userId = new Types.ObjectId(userFound._id as string);
              const loansFound = await this.loans.findByUser(userFound._id);

              if (loansFound.length > 0) {
                const loan = loansFound[0];

                if (loan.status === LoanStatus.ONGOING) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text: `We will proceed to the payment of the ${loan.settlementCounter + 1}th settlement...`,
                  });
                  await this.socket.sendMessage(userWhasappsId!, {
                    text:
                      `Please provide the phone number of the Momo payer like this M:phone number` +
                      '\nExample: M:224666666666',
                  });
                } else if (loan.status === LoanStatus.WAITINGPAYMENT) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text: 'You should first pay the activation fee before proceeding to the the payement of the settlement',
                  });
                } else if (loan.status === LoanStatus.INITIATED) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text:
                      `\n> *4.Pay settlement-- 🟠*` +
                      `\nYou already started a loan request but you didn't set a settlement yet ` +
                      '\nPlease set a settlement before proceeding to the activation fee payment',
                  });
                } else if (loan.status === LoanStatus.PAID) {
                  await this.socket.sendMessage(userWhasappsId!, {
                    text: `You already paid all your settlement amounts.`,
                  });
                }
              } else {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: `You don't have a loan request yet. Please, choose option 3 to start a loan request`,
                });
              }
            } catch (error) {
              if (error.message === 'User not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
                });
              } else if (error.message === 'Scoring not found') {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'No scoring data found for this phone number',
                });
              } else {
                console.log('PAYMMMENT', error.message);
                await this.socket.sendMessage(userWhasappsId!, {
                  text: "We weren't able to initiate a payment. Please, try later...",
                });
              }
            }
          }
        }

        if (momoregex.test(userMessage)) {
          const phoneNumber = userMessage.slice(2).trim();

          await this.socket.sendMessage(userWhasappsId!, {
            text: `Wait the payment of the settlement with the phone ${phoneNumber} is in progress...`,
          });
          try {
            var userFound;

            const tUser = this.getTempUserByIdForPay(userWhasappsId!);

            if (!tUser) {
              userFound = await this.users.findByWhatsappId(userWhasappsId!);
            } else {
              userFound = await this.users.findByPhone(tUser.phoneForPay);
            }

            const userId = new Types.ObjectId(userFound._id as string);
            const loansFound = await this.loans.findByUser(userFound._id);

            if (loansFound.length > 0) {
              const loan = loansFound[0];

              if (loan.status === LoanStatus.ONGOING) {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: `We will proceed to the payment of the ${loan.settlementCounter + 1}the settlement...`,
                });
                const referenceId = uuidv4();
                const data = await this.paymentService.requestPay(
                  phoneNumber,
                  loan.activationFee,
                  referenceId,
                );

                const pendingTransaction: CreateTransactionDto = {
                  referenceId: referenceId,
                  payerPhone: phoneNumber,
                  owner: userFound._id as string,
                  status: TransactionStatus.PENDING,
                  payerWhatsappId: userWhasappsId!,
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

                    // send update to summy app with new transaction details
                    // const response =
                    //   await this.paymentService.requestActivationCode(
                    //     userFound,
                    //   );

                    const updateLoanDto: UpdateLoanDto = {
                      status:
                        loan.settlement.numberOfPayments ===
                        loan.settlementCounter + 1
                          ? LoanStatus.PAID
                          : LoanStatus.ONGOING,
                      paidAmount: loan.paidAmount + transactionData.amount,
                      settlementCounter: loan.settlementCounter + 1,
                    };

                    const loanId = new Types.ObjectId(loan._id as string);
                    await this.loans.update(loanId, updateLoanDto);

                    await this.socket.sendMessage(userWhasappsId!, {
                      text: `Congratulations, your payment of the ${updateLoanDto.settlementCounter} was successful.`,
                    });
                  } else {
                    const failedTransaction: UpdateTransactionDto = {
                      status: TransactionStatus.FAILED,
                    };
                    const updatedTransaction = await this.transactions.update(
                      createdTransactionId,
                      failedTransaction,
                    );
                    await this.socket.sendMessage(userWhasappsId!, {
                      text: 'Payment failed. Please, try again or contact the customer support',
                    });
                  }
                  //const createdTransaction = await this.transactions.create()
                }
              }
              if (loan.status === LoanStatus.WAITINGPAYMENT) {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: 'You should first pay the activation fee before proceeding to the the payement of the settlement',
                });
              } else if (loan.status === LoanStatus.INITIATED) {
                await this.socket.sendMessage(userWhasappsId!, {
                  text:
                    `\n> *4.Pay settlement -- 🟠*` +
                    `\nYou already started a loan request but you didn't set a settlement yet ` +
                    '\nPlease set a settlement before proceeding to the activation fee payment',
                });
              } else if (loan.status === LoanStatus.PAID) {
                await this.socket.sendMessage(userWhasappsId!, {
                  text: `You already paid all your settlement amounts.`,
                });
              }
            } else {
              await this.socket.sendMessage(userWhasappsId!, {
                text: `You don't have a loan request yet. Please, choose option 3 to start a loan request`,
              });
            }
          } catch (error) {
            if (error.message === 'User not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'You need to register first. Please, choose option 1 to start the KYC registration process',
              });
            } else if (error.message === 'Scoring not found') {
              await this.socket.sendMessage(userWhasappsId!, {
                text: 'No scoring data found for this phone number',
              });
            } else {
              console.log('PAYMMMENT', error.message);
              await this.socket.sendMessage(userWhasappsId!, {
                text: "We weren't able to initiate a payment. Please, try later...",
              });
            }
          }
        }

        if (regphoneregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'phone',
            'Phone Number',
            userMessage,
            0,
          );
        }

        if (refphoneregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'refPhone',
            'Reference Phone Number',
            userMessage,
            1,
          );
        }

        if (nameregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'name',
            'Name',
            userMessage,
            2,
          );
        }

        if (surnameregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'surname',
            'Surname',
            userMessage,
            3,
          );
        }

        if (birthdateregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'birthday',
            'Birthday',
            userMessage,
            4,
          );
        }

        if (addressregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'address',
            'Address',
            userMessage,
            5,
          );
        }

        if (roleregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'role',
            'Role',
            userMessage,
            6,
          );
        }

        if (idNumberregex.test(userMessage)) {
          await this.updateField(
            userWhasappsId!,
            'idNumber',
            'ID Number',
            userMessage,
            7,
          );
        }
      }

      // if the message is an image
      if (messageType === 'imageMessage') {
        const userFound = await this.users.findByWhatsappId(m.key.remoteJid);

        if (!userFound) {
          return;
        }

        if (
          userFound.step === 7 ||
          userFound.step === 8 ||
          userFound.step === 9
        ) {
          const buffer = await downloadMediaMessage(
            m,
            'buffer',
            {},
            {
              logger: logger,
              // pass this so that baileys can request a reupload of media
              // that has been deleted
              reuploadRequest: this.socket.updateMediaMessage,
            },
          );

          let url = '';

          if (userFound.step === 7) {
            url = `./idphoto/${userFound.idNumber}-card.jpeg`;
            await this.updateField(
              m.key.remoteJid!,
              'idCardPhotoUrl',
              'ID Card Photo',
              url,
              userFound.step + 1,
            );
          }

          if (userFound.step === 8) {
            url = `./idphoto/${userFound.idNumber}-facecard.jpeg`;
            await this.updateField(
              m.key.remoteJid!,
              'idCardFacePhotoUrl',
              'ID Card Face Photo',
              url,
              userFound.step + 1,
            );
          }

          if (userFound.step === 9) {
            url = `./idphoto/${userFound.idNumber}-facerecongition.jpeg`;
            await this.updateField(
              m.key.remoteJid!,
              'facerecognitionData',
              'Face Image',
              url,
              userFound.step + 1,
            );
          }

          await writeFile(url, buffer);
        }
        // download the message

        // save to file
      }
    });
    this.socket.ev.on('creds.update', saveCreds);
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
          `\n> *1.KYC Registration -- 🔴*` +
          '\n*`STEP 0`*' +
          '\n\nPlease provide your phone number like P:(224)(9 digits)' +
          '\nExample: P:224123456789'
        );
      case 1:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 1`*' +
          '\n\nPlease provide the phone number of Reference like R:(224)(9 digits)' +
          '\nExample: R:224123456789'
        );
      case 2:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 2`*' +
          '\n\nPlease provide your name like N:Your Name' +
          '\nExample: N:Mazuba'
        );
      case 3:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 3`*' +
          '\n\nPlease provide your surname like S:Your Surname' +
          '\nExample: S:Lionnel'
        );
      case 4:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 4`*' +
          '\n\nPlease provide your birthdate like B:Your Birthday' +
          '\nExample: B:22/09/1987'
        );
      case 5:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 5`*' +
          '\n\nPlease provide your address like A:Your Address' +
          '\nExample: A:Kinshasa, C/Limete, Q.Masina'
        );

      case 6:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 6`*' +
          '\n\nPlease choose a role. How would you want to be registered:' +
          `\n> *RO:1 -- Customer*` +
          `\n> *RO:2 -- Agent*` +
          '\nExample:Reply by RO:1, to be register as a Customer'
        );
      case 7:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 7`*' +
          '\n\nPlease provide your ID Number like I:Your ID Number' +
          '\nExample: I:348765488999'
        );
      case 8:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 8`*' +
          '\n\nPlease provide a picture of your ID Card'
        );
      case 9:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 9`*' +
          '\n\nPlease provide a picture of your ID Card with your face'
        );
      case 10:
        return (
          `\n> *1.KYC Registration -- 🟠*` +
          '\n*`STEP 10`*' +
          '\n\nPlease provide a picture of your face for the face recognition purpose'
        );
      case 11:
        return (
          `\n> *1. KYC Registration -- Finished 🟢*` +
          '\n*`Summary of your registration`*' +
          `\n\n> Phone Number: ${user?.phone}` +
          `\n> Name: ${user?.name}` +
          `\n> Surname: ${user?.surname}` +
          `\n> Birthday: ${user?.birthday}` +
          `\n> Address: ${user?.address}` +
          `\n> Role: ${user?.role}` +
          `\n> ID Number: ${user?.idNumber}` +
          `\n> ID Card Photo: ${user?.idCardPhotoUrl}` +
          `\n> ID Card Face Photo: ${user?.idCardFacePhotoUrl}` +
          `\n> Face Photo: ${user?.facerecognitionData}` +
          `\n\nYour KYC Registration is now complete. You can now start using the platform` +
          '\nType ' +
          '*`/start`*' +
          ' to start using our services' +
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
        `Your ${fieldFormatted}: ${value.slice(2).trim()} has been received` +
        '\nUpdating ... Be ready for the next step !',
    });

    const userToUpdate = await this.users.findByWhatsappId(jid);

    // if (!userToUpdate && step !== 0) {
    //   await this.socket.sendMessage(jid, {
    //     text: 'User not found. Try to connect with good Whasapps account',
    //   });
    //   return;
    // }

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
            text: 'We could not add this field. Try again later.',
          });
        }
      } else {
        await this.socket.sendMessage(jid, {
          text: `You didn't provide the awaiting field, please provide the required field: ${userToUpdate.waitingAction}`,
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
        // const user: UpdateUserDto = {
        //   waitingAction: field,
        // };
        // await this.users.update(createdUser.id, user);
      } else {
        await this.socket.sendMessage(jid, {
          text: 'We could not create user. Try again later.',
        });
      }
    } else if (!userToUpdate && step !== 0) {
      await this.socket.sendMessage(jid, {
        text: 'User not found. Try to connect with good Whasapps account',
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

  async onModuleDestroy() {
    this.socket?.close();
  }
}
