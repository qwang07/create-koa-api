import { PrismaClient } from '@prisma/client';
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('database');

class Database {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Query event
    this.prisma.$on('query', (e) => {
      logger.debug('Executing database query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`
      });
    });

    // Error event
    this.prisma.$on('error', (e) => {
      logger.error('Database error', {
        message: e.message,
        target: e.target
      });
    });

    // Info event
    this.prisma.$on('info', (e) => {
      logger.info('Database info', {
        message: e.message,
        target: e.target
      });
    });

    // Warn event
    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning', {
        message: e.message,
        target: e.target
      });
    });

    // Disconnect on process exit
    process.on('beforeExit', this.disconnect.bind(this));
    process.on('SIGINT', this.disconnect.bind(this));
    process.on('SIGTERM', this.disconnect.bind(this));
  }

  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed', { error });
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Failed to close database connection', { error });
      // Don't throw error in this case, as it's during cleanup
    }
  }

  // Get Prisma client instance
  getPrismaClient() {
    return this.prisma;
  }

  // Health check
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }
}

// Create singleton instance
const database = new Database();

export default database;
