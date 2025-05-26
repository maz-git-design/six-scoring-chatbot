import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AwaitAction } from './session.enum';

export type UserSessionData = {
  phone?: string;
  otp?: string;
  waitingAction?: AwaitAction;
  chachedWaitingAction?: AwaitAction;
  lastUserMessage?: string;
  step?: number;
  role?: string;
  name?: string;
};

@Injectable()
export class SessionService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get(userId: string): Promise<UserSessionData> {
    // Returns an empty object if no session exists
    return (await this.cacheManager.get<UserSessionData>(userId)) || {};
  }

  // async set(userId: string, data: Partial<UserSessionData>): Promise<void> {
  //   const existing = await this.get(userId);
  //   const newData = { ...existing, ...data };
  //   // Save with the TTL defined in the CacheModule config
  //   await this.cacheManager.set(userId, newData);
  // }

  async set(
    userId: string,
    data: Partial<UserSessionData>,
    ttlSeconds?: number,
  ): Promise<void> {
    const existing = await this.get(userId);
    const newData = { ...existing, ...data };
    await this.cacheManager.set(userId, newData, ttlSeconds ?? 1800000);
  }

  async clear(userId: string): Promise<void> {
    await this.cacheManager.del(userId);
  }

  async has(userId: string): Promise<boolean> {
    const session = await this.get(userId);
    return Object.keys(session).length > 0;
  }
}
