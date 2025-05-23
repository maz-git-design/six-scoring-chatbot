import { InternalServerErrorException } from '@nestjs/common';
import constants from 'src/configs/constants';

import * as twilio from 'twilio';
import { MachineToMachineInstance } from 'twilio/lib/rest/api/v2010/account/availablePhoneNumberCountry/machineToMachine';

const client = twilio(constants.twilio.accountSid, constants.twilio.authToken);

const sendTwiloSMS = async (to: string, message: string) => {
  //   if (!isValid(to)) throw new InternalServerErrorException('Invalid phone number');

  await client.messages
    .create({
      body: message,
      from: constants.twilio.origin,
      to: to,
    })
    .then((res) => console.info('SMS sent to', res.to))
    .catch((e) => {
      throw new InternalServerErrorException({
        message: e.message,
        service: 'twilio',
      });
    });
};

export default sendTwiloSMS;
