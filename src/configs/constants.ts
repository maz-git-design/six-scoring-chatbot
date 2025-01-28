import randHexStr from '../utils/rand-str';

const {
  APP_COMMON_NAME = 'localhost',
  AWS_S3_ACCESS_KEY_ID,
  AWS_S3_BUCKET = 'ged-files.dev',
  AWS_S3_REGION = 'eu-west-1',
  AWS_S3_SECRET_ACCESS_KEY,
  FILES_DIR = './files',
  FILES_URL = 'http://localhost:4008/files',
  GEMINI_API_KEY,
  HOSTNAME = randHexStr(),
  MONGO_DB_CONNECTION = 'mongodb://localhost:27017/scoringDB',
  NODE_ENV = 'local',
  NODE_PORT = 3000,
  OPENAI_ORG,
  OPENAI_TOKEN,
  PWD,
  RABBIT_MQ_CONNECTION = 'amqp://developer:developer@rabbitmq.altiustechnology.com:30002/host-0',
  REDIS_DB_CONNECTION = 'redis://:87e94b2dc653a402@redis.altiustechnology.com:30001',
  SECRET = 'e7b579900232f3b6ccb7ed7d7bbd492b',
  SESSION_DOMAIN,
  SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000, // 7 days in ms
} = process.env;

const constants = {
  app: {
    id: randHexStr(),
    commonName: APP_COMMON_NAME,
    url: `http://${APP_COMMON_NAME}`,
    apiUri: `http://${APP_COMMON_NAME}/api`,
  },
  files: {
    dir: FILES_DIR,
    url: FILES_URL,
  },
  aws: {
    s3: {
      bucket: AWS_S3_BUCKET,
      region: AWS_S3_REGION,
      accessKeyId: AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
    },
  },
  secret: SECRET,
  root: PWD,
  nodePort: +NODE_PORT,
  hostname: HOSTNAME,
  mongoUrl: MONGO_DB_CONNECTION,
  redisUrl: REDIS_DB_CONNECTION,
  rabbitMqUrl: RABBIT_MQ_CONNECTION,
  env: {
    name: NODE_ENV,
    prod: NODE_ENV === 'production',
    local: NODE_ENV === 'local',
    dev: NODE_ENV === 'development',
  },
  session: {
    name: 'ged',
    domain: SESSION_DOMAIN,
    timeout: +SESSION_TIMEOUT,
  },
  ms: {
    main: { name: 'MAIN_SERVICE', queue: `${NODE_ENV}:ged:main` },
    notif: { name: 'NOTIF_SERVICE', queue: `${NODE_ENV}:ged:notif` },
    scheduler: {
      name: 'SCHEDULER_SERVICE',
      queue: `${NODE_ENV}:ged:scheduler`,
    },
    socket: { name: 'SOCKET_SERVICE', queue: `${NODE_ENV}:ged:socket` },
  },
  openai: {
    url: 'https://api.openai.com/v1/chat',
    token: OPENAI_TOKEN,
    organisation: OPENAI_ORG,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_TOKEN}`,
      'OpenAI-Organization': OPENAI_ORG,
    },
  },
  google: {
    generativeAI: {
      apiKey: GEMINI_API_KEY,
    },
  },
  mask: { month: 'YYYYMM' },
};

console.log('==============================================================');
for (const key in constants) console.log(`${key}:`, constants[key]);
console.log('==============================================================');

export default constants;
