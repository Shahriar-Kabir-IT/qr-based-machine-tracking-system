import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.redis.connect().catch(() => {
      console.warn('Redis not available — caching disabled');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 10): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {}
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) await this.redis.del(...keys);
    } catch {}
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
