import { MongooseModuleOptions } from '@nestjs/mongoose';
import constants from './constants';

const mongooseModuleOptions: MongooseModuleOptions = {
  retryDelay: 1000,
  retryAttempts: 1,
  autoIndex: true,
  directConnection: constants.env.local,
  connectionFactory: (connection) => {
    const { host, port, name } = connection;
    console.info({ message: 'MongoDB connected', host, port, name });
    return connection;
  },
  connectionErrorFactory: (error) => {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit();
  },
};

export default mongooseModuleOptions;
