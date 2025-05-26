import { AwaitAction } from 'src/session/session.enum';

// otp.context.ts
export interface OtpContext {
  userWhatsappId: string;
  userMessage: string;
  phone?: string;
  awaitAction?: AwaitAction;
}
