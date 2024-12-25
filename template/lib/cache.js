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

      // Wait for connection to succeed
      await new Promise((resolve, reject) => {
        this.client.once('connect', () => {
          this.connected = true;
          logger.info('Cache service connected successfully');
          resolve();
        });

        this.client.once('error', (err) => {
          if (!this.connected) {
            reject(err);
          }
        });

        // Set timeout
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Cache service connection timed out'));
          }
        }, 5000);
      });

      // Listen for subsequent errors
      this.client.on('error', (err) => {
        logger.error('Cache service error:', err);
      });

      return this.client;
    } catch (err) {
      logger.error('Cache service connection failed:', err);
      throw err;
    }
  }

  async get(key) {
    if (!this.connected) {
      throw new Error('Cache service not connected');
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.error('Cache read failed:', err);
      throw err;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.connected) {
      throw new Error('Cache service not connected');
    }

    try {
      const stringValue = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.setex(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (err) {
      logger.error('Cache write failed:', err);
      throw err;
    }
  }

  async del(key) {
    if (!this.connected) {
      throw new Error('Cache service not connected');
    }

    try {
      await this.client.del(key);
    } catch (err) {
      logger.error('Cache delete failed:', err);
      throw err;
    }
  }

  async quit() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      logger.info('Cache service disconnected');
    }
  }
}

export default new Cache();
