import { Logger } from '@nestjs/common';
import axios from 'axios';
import { exec } from 'child_process';
import constants from 'src/configs/constants';
import { promisify } from 'util';

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

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

/**
 * Sends a raw HTTP GET request and returns only the HTTP status code.
 * Does not handle or process the response body (even if it's XML).
 */
export async function sendRawHttpRequest(urlStr: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const req = lib.get(parsedUrl, (res) => {
      console.log(`✅ HTTP Status: ${res.statusCode}`);

      res.on('data', () => {}); // Ignore body
      res.on('end', () => resolve(res.statusCode ?? 0));
    });

    req.on('error', (err) => {
      console.error(`❌ Request failed:`, err.message);
      reject(err);
    });
  });
}

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

const sendOTP = async (to: string, message: string) => {
  const logger = new Logger('Send OTP Service');
  const requestOptions = {
    method: 'GET',
    redirect: 'follow',
  };

  fetch(
    `http://102.176.160.207:9001/smshttpquery/qs?REQUESTTYPE=SMSSubmitReq&USERNAME=SIXHTTP&PASSWORD=Six@2025&MOBILENO=${encodeURIComponent(to)}&ORIGIN_ADDR=Afrrikia&TYPE=0&MESSAGE=${encodeURIComponent(message)}`,
  )
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
};
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
//     const response = await axios.get(baseUrl, {
//       params,
//       validateStatus: () => true,
//       responseType: 'text',
//     });
//     console.log('✅ Response:', response.data);
//     logger.log(`SMS sent successfully to ${to}: ${response.data}`);
//   } catch (error) {
//     console.error('❌ Error sending SMS:', error.message);
//     logger.error(`Failed to send SMS to ${to}: ${error.message}`);
//   }
// };

// const sendOTP = async (to: string, message: string) => {
//   const logger = new Logger('Send OTP Service');

//   const encodedMessage = encodeURIComponent(message);
//   const url = `http://102.176.160.207:9001/smshttpquery/qs?REQUESTTYPE=SMSSubmitReq&USERNAME=SIXHTTP&PASSWORD=Six@2025&MOBILENO=${to}&ORIGIN_ADDR=Afrrikia&TYPE=0&MESSAGE=${encodedMessage}`;

//   const statusCode = await sendRawHttpRequest(url);
//   return statusCode;
// };

export default sendOTP;
