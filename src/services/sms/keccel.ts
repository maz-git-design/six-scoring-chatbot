import axios from 'axios';
import constants from 'src/configs/constants';

const sendSMS = async (to: string, message: string) => {
  const url = 'https://api.keccel.com/sms/v2/message.asp';
  await axios
    .post(url, {
      from: '',
      to: '',
      message,
      token: '',
    })
    .then((res) => {
      console.info(res.data);
      if (res.data.status.toLowerCase() !== 'sent')
        console.error({ message: res.data.description, service: 'keccel' });
    })
    .catch((e) => {
      console.error({ message: e.message, service: 'keccel' });
    });
};

export default sendSMS;
