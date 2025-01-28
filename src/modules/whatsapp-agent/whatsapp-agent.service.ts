import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CreateWhatsappAgentDto } from './dto/create-whatsapp-agent.dto';
import { UpdateWhatsappAgentDto } from './dto/update-whatsapp-agent.dto';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

@Injectable()
export class WhatsappAgentService implements OnModuleInit, OnModuleDestroy {
  private socket;
  private readonly authFile = 'auth_info_baileys';

  async onModuleInit() {
    this.connectToWhatsApp();
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
    this.socket.ev.on('messages.upsert', async (m) => {
      console.log(JSON.stringify(m, undefined, 2));

      console.log('replying to', m.messages[0].key.remoteJid);
      console.log('replying to', m.messages[0].key.message);
      if (m.messages[0].message.extendedTextMessage.text === 'start') {
        // await this.socket.sendMessage(m.messages[0].key.remoteJid!, {
        //   text: `Welcome to Affrikia ${m.messages[0].pushName}`,
        // });

        await this.socket.sendMessage(m.messages[0].key.remoteJid!, {
          text:
            `Welcome to Affrikia ${m.messages[0].pushName}` +
            '\nHow can I help you ?' +
            '\n' +
            '\nPlease choose an option to start' +
            '\n> *1.KYC Registration*' +
            '\n> *2.Scoring Verification*' +
            '\n> *3.Loan Request*' +
            '\n\n```SIXBot©copyright 2025```',
        });
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
