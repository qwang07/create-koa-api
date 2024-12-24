import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('database');

class Database {
  constructor() {
    this.client = null;
  }

  async connect() {
    if (!process.env.DATABASE_URL) {
      logger.warn('数据库连接URL未配置，数据库功能将被禁用');
      return null;
    }

    try {
      this.client = new PrismaClient({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' }
        ]
      });

      // 日志事件处理
      this.client.$on('query', (e) => {
        logger.debug('数据库查询:', e);
      });

      this.client.$on('error', (e) => {
        logger.error('数据库错误:', e);
      });

      this.client.$on('info', (e) => {
        logger.info('数据库信息:', e);
      });

      this.client.$on('warn', (e) => {
        logger.warn('数据库警告:', e);
      });

      await this.client.$connect();
      logger.info('数据库连接成功');
      return this.client;
    } catch (err) {
      logger.error('数据库连接失败:', err);
      throw err;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
      logger.info('数据库连接已断开');
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('数据库未连接，请先调用 connect() 方法');
    }
    return this.client;
  }

  // 事务处理
  async transaction(callback) {
    if (!this.client) {
      throw new Error('数据库未连接');
    }

    try {
      const result = await this.client.$transaction(callback);
      return result;
    } catch (err) {
      logger.error('数据库事务执行失败:', err);
      throw err;
    }
  }

  // 批量操作
  async batch(operations) {
    if (!this.client) {
      throw new Error('数据库未连接');
    }

    try {
      const result = await this.client.$transaction(operations);
      return result;
    } catch (err) {
      logger.error('数据库批量操作失败:', err);
      throw err;
    }
  }
}

export default new Database();
