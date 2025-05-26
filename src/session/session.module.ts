import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { SessionService } from './session.service';
import { Module } from '@nestjs/common';
import { createKeyv, Keyv } from '@keyv/redis';
import { CacheableMemory } from 'cacheable';

@Module({
  imports: [
    // CacheModule.register({
    //   store: redisStore,
    //   host: 'localhost', // change as needed
    //   port: 6379, // change as needed
    //   ttl: 3600, // default time-to-live (in seconds) for sessions
    // }),
    CacheModule.registerAsync({
      useFactory: async () => {
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            createKeyv(
              `redis://${process.env.REDIS_HOST || 'mvp-redis'}:${process.env.REDIS_PORT || 6379}`,
            ),
          ],
        };
      },
    }),
  ],
  providers: [SessionService],
  exports: [SessionService, CacheModule],
})
export class SessionModule {}
