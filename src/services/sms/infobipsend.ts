var https = require('follow-redirects').https;
var fs = require('fs');

var options = {
  method: 'POST',
  hostname: 'pe4g98.api.infobip.com',
  path: '/2fa/2/pin',
  headers: {
    Authorization:
      'App 4f9f5876ec44fb77a97f85c2ecc72539-07d0f786-5ca2-42eb-a0f4-a55738f55772',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  maxRedirects: 20,
};

var req = https.request(options, function (res) {
  var chunks = [];

  res.on('data', function (chunk) {
    chunks.push(chunk);
  });

  res.on('end', function (chunk) {
    var body = Buffer.concat(chunks);
    console.log(body.toString());
  });

  res.on('error', function (error) {
    console.error(error);
  });
});

var postData = JSON.stringify({
  applicationId: '{{applicationId}}',
  messageId: '{{messageId}}',
  from: 'ServiceSMS',
  to: '243892007346',
});

req.write(postData);

req.end();

const sendMessage = async (to: string, message: string) => {
  req.write(postData);
  req.end();
};
