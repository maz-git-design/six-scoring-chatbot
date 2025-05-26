import sendOTP from 'src/services/sms/infobip';
import { AwaitAction } from 'src/session/session.enum';

export function SendOtp(ttlSeconds: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = args.find(
        (arg) => arg?.userWhatsappId && arg?.userMessage && arg?.awaitAction,
      );
      if (!context) throw new Error('SendOtp: Missing WhatsApp context.');

      const { userWhatsappId, userMessage, awaitAction } = context;
      const sessionService = this.sessionService;
      const usersService = this.users;
      const socket = this.socket;

      if (!sessionService || !usersService || !socket) {
        throw new Error('SendOtp: Missing dependencies.');
      }
      const session = await sessionService.get(userWhatsappId);
      console.log('Session:', session);
      const phone = session.phone;
      try {
        const userOtp = await usersService.generateOTP(phone);
        console.log('OTP généré:', userOtp);
        const otp = userOtp.otp;

        await sendOTP(phone, `Votre code OTP est ${otp}`);

        await sessionService.set(
          userWhatsappId,
          {
            otp,
            waitingAction: AwaitAction.AWAIT_OTP_GUARD,
            chachedWaitingAction: awaitAction,
            lastUserMessage: userMessage,
          }, // Set OTP expiration
        );

        await socket.sendMessage(userWhatsappId, {
          text:
            `✅ Un code OTP a été envoyé au numéro : ${phone}` +
            `\n(exp. 5 min)`,
        });

        return await originalMethod.apply(this, args);
      } catch (error) {
        console.log('Erreur OTP:', error.message);

        if (error.message === 'User not found') {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          await sendOTP(userMessage, `Votre code OTP est ${otp}`);

          await sessionService.set(userWhatsappId, {
            otp,
            waitingAction: AwaitAction.AWAIT_OTP_GUARD,
            chachedWaitingAction: awaitAction,
            lastUserMessage: userMessage,
          });

          await socket.sendMessage(userWhatsappId, {
            text:
              `✅ Un code OTP a été envoyé au numéro : ${phone}` +
              `\n(exp. 5 min)`,
          });

          return await originalMethod.apply(this, args);
        }

        await socket.sendMessage(userWhatsappId, {
          text: '❌ Erreur lors de l’envoi du code OTP. Veuillez réessayer.',
        });
      }
    };

    return descriptor;
  };
}
