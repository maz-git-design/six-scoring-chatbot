import { AwaitAction } from 'src/session/session.enum';
import { OtpContext } from './otp.context';

export function OtpVerification() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const index = args.findIndex(
        (arg) => arg?.userWhatsappId && arg?.userMessage,
      );

      if (index === -1) {
        console.warn('OtpProtected: Invalid context');
        return;
      }
      const context: OtpContext = args[index];

      if (!context) {
        console.warn('OtpProtected: Invalid context');
        return;
      }

      const { userWhatsappId, userMessage } = context;
      const otpCode = userMessage.trim();

      const sessionService = this.sessionService;
      const socket = this.socket;

      if (!sessionService || !socket) {
        throw new Error('OtpProtected: Missing dependencies on "this" context');
      }

      const session = await sessionService.get(userWhatsappId);

      if (
        session.waitingAction !== AwaitAction.AWAIT_OTP_GUARD ||
        !session.otp
      ) {
        await socket.sendMessage(userWhatsappId, {
          text: '❌ Vous ne pouvez pas encore vérifier le code OTP.',
        });
        return;
      }

      if (otpCode === session.otp) {
        await sessionService.clear(userWhatsappId);

        await socket.sendMessage(userWhatsappId, {
          text: '✅ Code OTP vérifié avec succès.',
        });

        args[index] = {
          ...context,
          userMessage: session.lastUserMessage,
        };

        return await originalMethod.apply(this, args);
      }

      await socket.sendMessage(userWhatsappId, {
        text: '❌ Code OTP incorrect. Veuillez réessayer.',
      });

      return;
    };

    return descriptor;
  };
}
