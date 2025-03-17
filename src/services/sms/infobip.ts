import axios from 'axios';
import constants from 'src/configs/constants';

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

const sendOTP = async (to: string, message: string) => {
  const url = 'sms/2/text/advanced';
  var postData = JSON.stringify({
    messages: [
      {
        destinations: [{ to: to }],
        from: 'ServiceSMS',
        text: message,
      },
    ],
  });

  await service
    .post(url, postData)
    .then((res) => {
      console.info(res.data);
      if (res.data.status.toLowerCase() !== 'sent')
        console.error({ message: res.data.description, service: 'infobip' });
    })
    .catch((e) => {
      console.error({ message: e.message, service: 'infobip' });
    });
};

export default sendOTP;
