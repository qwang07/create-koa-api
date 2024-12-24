import Redis from 'ioredis';
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('cache');

class Cache {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (this.client) {
      return this.client;
    }

    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      // 等待连接成功
      await new Promise((resolve, reject) => {
        this.client.once('connect', () => {
          this.connected = true;
          logger.info('缓存服务连接成功');
          resolve();
        });

        this.client.once('error', (err) => {
          if (!this.connected) {
            reject(err);
          }
        });

        // 设置超时
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('缓存服务连接超时'));
          }
        }, 5000);
      });

      // 监听后续的错误
      this.client.on('error', (err) => {
        logger.error('缓存服务错误:', err);
      });

      return this.client;
    } catch (err) {
      logger.error('缓存服务连接失败:', err);
      throw err;
    }
  }

  async get(key) {
    if (!this.connected) {
      throw new Error('缓存服务未连接');
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.error('缓存读取失败:', err);
      throw err;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.connected) {
      throw new Error('缓存服务未连接');
    }

    try {
      const stringValue = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.setex(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (err) {
      logger.error('缓存写入失败:', err);
      throw err;
    }
  }

  async del(key) {
    if (!this.connected) {
      throw new Error('缓存服务未连接');
    }

    try {
      await this.client.del(key);
    } catch (err) {
      logger.error('缓存删除失败:', err);
      throw err;
    }
  }

  async quit() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      logger.info('缓存服务已断开连接');
    }
  }
}

export default new Cache();
