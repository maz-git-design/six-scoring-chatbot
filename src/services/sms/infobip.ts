import { Logger } from '@nestjs/common';
import axios from 'axios';
import { exec } from 'child_process';
import constants from 'src/configs/constants';
import { promisify } from 'util';

const service = axios.create({
  baseURL: 'https://pe4g98.api.infobip.com/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization:
      'App 4f9f5876ec44fb77a97f85c2ecc72539-07d0f786-5ca2-42eb-a0f4-a55738f55772',
  },
  maxRedirects: 20,
});

var options = {
  method: 'POST',
  hostname: 'pe4g98.api.infobip.com',
  path: '/sms/2/text/advanced',
  headers: {
    Authorization:
      'App 4f9f5876ec44fb77a97f85c2ecc72539-07d0f786-5ca2-42eb-a0f4-a55738f55772',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  maxRedirects: 20,
};

// const sendOTP = async (to: string, message: string) => {
//   const url = 'sms/2/text/advanced';

//     messages: [
//       {
//         destinations: [{ to: to }],
//         from: 'Afrrikia',
//         text: message,
//       },
//     ],
//   });

//   await service
//     .post(url, postData)
//     .then((res) => {
//       console.info(res.data);
//       if (res.data.status.toLowerCase() !== 'sent')
//         console.error({ message: res.data.description, service: 'infobip' });
//     })
//     .catch((e) => {
//       console.error({ message: e.message, service: 'infobip' });
//     });
// };

// const sendOTP = async (to: string, message: string) => {
//   const logger = new Logger('Send OTP Service');
//   const baseUrl = 'http://102.176.160.207:9001/smshttpquery/qs';
//   const params = {
//     REQUESTTYPE: 'SMSSubmitReq',
//     USERNAME: 'SIXHTTP',
//     PASSWORD: 'Six@2025',
//     MOBILENO: to,
//     ORIGIN_ADDR: 'Afrrikia',
//     TYPE: '0',
//     MESSAGE: message,
//   };

//   try {
//     const response = await axios.get(baseUrl, { params });
//     console.log('✅ Response:', response.data);
//     logger.log(`SMS sent successfully to ${to}: ${response.data}`);
//   } catch (error) {
//     console.error('❌ Error sending SMS:', error.message);
//     logger.error(`Failed to send SMS to ${to}: ${error.message}`);
//   }
// };

const execPromise = promisify(exec);

const sendOTP = async (to: string, message: string) => {
  const logger = new Logger('Send OTP Service');

  const url =
    `http://102.176.160.207:9001/smshttpquery/qs` +
    `?REQUESTTYPE=SMSSubmitReq&USERNAME=SIXHTTP&PASSWORD=Six@2025` +
    `&MOBILENO=${to}&ORIGIN_ADDR=Afrrikia&TYPE=0&MESSAGE=${encodeURIComponent(message)}`;

  try {
    const { stdout } = await execPromise(
      `curl -s -o /dev/null -w "%{http_code}" "${url}"`,
    );
    logger.log(`✅ SMS request sent to ${to}. HTTP status: ${stdout}`);
  } catch (error: any) {
    logger.error(`❌ Failed to send SMS to ${to}: ${error.message}`);
  }
};

export default sendOTP;
