import { PrismaClient } from '@prisma/client';
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('lib:db');

// 纯函数：创建基础配置
const createBaseConfig = (options) => ({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ],
  ...options
});

// 纯函数：创建事件处理器
const createEventHandlers = () => ({
  error: (e) => logger.error('Database error', {
    message: e.message,
    target: e.target
  }),
  warn: (e) => logger.warn('Database warning', {
    message: e.message,
    target: e.target
  })
});

// 纯函数：设置事件监听
const setupEvents = (prisma, handlers) => {
  Object.entries(handlers).forEach(([event, handler]) => {
    prisma.$on(event, handler);
  });
  return prisma;
};

/**
 * 创建 Prisma 客户端
 * @param {Object} options Prisma 配置选项
 * @returns {Object} Prisma 客户端实例
 */
export const createPrismaClient = (options = {}) => 
  setupEvents(
    new PrismaClient(createBaseConfig(options)),
    createEventHandlers()
  );

/**
 * 连接数据库
 * @param {Object} prisma Prisma 客户端实例
 * @returns {Promise<Object>} Prisma 客户端实例
 */
export const connect = async (prisma) => {
  if (!prisma) {
    throw new Error('Database client not provided');
  }

  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
    return prisma;
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
};

/**
 * 断开数据库连接
 * @param {Object} prisma Prisma 客户端实例
 * @returns {Promise<void>}
 */
export const disconnect = async (prisma) => {
  if (!prisma) {
    return;
  }

  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Failed to close database connection', { error });
    // Don't throw error, just log it
  }
};

/**
 * 数据库健康检查
 * @param {Object} prisma Prisma 客户端实例
 * @returns {Promise<boolean>} 健康状态
 */
export const healthCheck = async (prisma) => {
  if (!prisma) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
};

// 纯函数：创建进程事件处理器
const createProcessHandlers = (prisma) => ({
  beforeExit: async () => {
    logger.info('Cleaning up database connection before exit');
    await disconnect(prisma);
  },
  SIGINT: async () => {
    logger.info('Received SIGINT signal, cleaning up database connection');
    await disconnect(prisma);
    process.exit(0);
  },
  SIGTERM: async () => {
    logger.info('Received SIGTERM signal, cleaning up database connection');
    await disconnect(prisma);
    process.exit(0);
  }
});

// 纯函数：设置进程事件
const setupProcessEvents = (handlers) => {
  Object.entries(handlers).forEach(([event, handler]) => {
    process.on(event, handler);
  });
};

/**
 * 创建数据库实例
 * @param {Object} config 配置选项
 * @returns {Promise<Object>} 数据库实例接口
 */
export const createDatabase = async (config = {}) => {
  const prisma = await createPrismaClient(config);
  await connect(prisma);
  
  // 设置进程事件处理
  setupProcessEvents(createProcessHandlers(prisma));

  return {
    client: prisma,
    connect: () => connect(prisma),
    disconnect: () => disconnect(prisma),
    healthCheck: () => healthCheck(prisma)
  };
};

export default createDatabase;
