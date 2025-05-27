import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// 👇 Force IPv4 DNS resolution
(require('dns') as any).setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3002);
}
bootstrap();
