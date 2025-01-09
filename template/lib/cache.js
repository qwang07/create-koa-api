import Redis from 'ioredis';
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('lib:cache');

// 纯函数：验证缓存键
const validateKey = (key) => {
  if (typeof key !== 'string' || !key) {
    throw new Error('Cache key must be a non-empty string');
  }
  return key;
};

// 纯函数：创建重试策略
const createRetryStrategy = (times) => {
  const delay = Math.min(times * 100, 2000);
  logger.warn(`Retry attempt ${times}, delay: ${delay}ms`);
  return delay;
};

// 纯函数：创建 Redis 配置
const createRedisConfig = (config = {}) => ({
  host: config.host || process.env.REDIS_HOST,
  port: config.port || process.env.REDIS_PORT,
  password: config.password || process.env.REDIS_PASSWORD,
  retryStrategy: config.retryStrategy || createRetryStrategy,
  maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
  enableReadyCheck: true,
  ...config
});

// 纯函数：创建事件处理器
const createEventHandlers = () => ({
  connect: () => logger.info('Redis client connected successfully'),
  error: (error) => logger.error('Redis client error:', error),
  close: () => logger.warn('Redis connection closed'),
  reconnecting: () => logger.info('Redis client reconnecting')
});

// 纯函数：设置事件监听
const setupEventListeners = (client, handlers) => {
  Object.entries(handlers).forEach(([event, handler]) => {
    client.on(event, handler);
  });
  return client;
};

// 纯函数：等待连接就绪
const waitForReady = (client, timeout = 5000) => 
  new Promise((resolve, reject) => {
    if (client.status === 'ready') {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Redis connection timeout'));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      client.removeListener('ready', onReady);
      client.removeListener('error', onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    client.once('ready', onReady);
    client.once('error', onError);
  });

// 柯里化的错误处理函数
const withErrorHandling = (operation) => async (...args) => {
  try {
    return await operation(...args);
  } catch (err) {
    const key = args[1]; // 第二个参数通常是 key
    logger.error(`Cache operation ${operation.name} failed:`, { key, error: err });
    throw err;
  }
};

// 纯函数：创建进程事件处理器
const createProcessHandlers = (client) => ({
  beforeExit: async () => {
    logger.info('Cleaning up cache connection before exit');
    await quit(client);
  },
  SIGINT: async () => {
    logger.info('Received SIGINT signal, cleaning up cache connection');
    await quit(client);
    process.exit(0);
  },
  SIGTERM: async () => {
    logger.info('Received SIGTERM signal, cleaning up cache connection');
    await quit(client);
    process.exit(0);
  }
});

// 纯函数：设置进程事件
const setupProcessEvents = (handlers) => {
  Object.entries(handlers).forEach(([event, handler]) => {
    process.on(event, handler);
  });
};

// 纯函数：序列化值
const serializeValue = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
};

// 纯函数：反序列化值
const deserializeValue = (value) => {
  if (!value) return null;
  
  // 如果是纯数字字符串，直接返回原始值
  if (/^\d+$/.test(value)) {
    return value;
  }
  
  try {
    const parsed = JSON.parse(value);
    // 如果解析后的值类型与原始值不同，返回原始值
    // 这可以防止 "123" 被解析为 123
    if (typeof parsed !== typeof value && typeof parsed !== 'object') {
      return value;
    }
    return parsed;
  } catch (e) {
    // 如果解析失败，说明是普通字符串
    return value;
  }
};

/**
 * 创建 Redis 客户端
 * @param {Object} config Redis 配置选项
 * @returns {Promise<Redis>} Redis 客户端实例
 */
export const createRedisClient = async (config = {}) => {
  try {
    const client = new Redis(createRedisConfig(config));
    setupEventListeners(client, createEventHandlers());
    await waitForReady(client);
    
    setupProcessEvents(createProcessHandlers(client));
    return client;
  } catch (err) {
    logger.error('Failed to create Redis client:', err);
    throw err;
  }
};

/**
 * 获取缓存值
 * @param {Redis} client Redis 客户端
 * @param {string} key 缓存键
 * @returns {Promise<any>} 缓存值
 */
export const get = withErrorHandling(async (client, key) => {
  validateKey(key);
  const value = await client.get(key);
  return deserializeValue(value);
});

/**
 * 设置缓存值
 * @param {Redis} client Redis 客户端
 * @param {string} key 缓存键
 * @param {any} value 缓存值
 * @param {number} ttl 过期时间（秒）
 * @returns {Promise<string>} 操作结果
 */
export const set = withErrorHandling(async (client, key, value, ttl = 0) => {
  validateKey(key);
  const serializedValue = serializeValue(value);
  return ttl > 0
    ? await client.setex(key, ttl, serializedValue)
    : await client.set(key, serializedValue);
});

/**
 * 删除缓存值
 * @param {Redis} client Redis 客户端
 * @param {string} key 缓存键
 * @returns {Promise<number>} 删除的键数量
 */
export const del = withErrorHandling(async (client, key) => {
  validateKey(key);
  return await client.del(key);
});

/**
 * 递增值
 * @param {Redis} client Redis 客户端
 * @param {string} key 缓存键
 * @returns {Promise<number>} 递增后的值
 */
export const incr = withErrorHandling(async (client, key) => {
  validateKey(key);
  return await client.incr(key);
});

/**
 * 设置过期时间（毫秒）
 * @param {Redis} client Redis 客户端
 * @param {string} key 缓存键
 * @param {number} milliseconds 过期时间（毫秒）
 * @returns {Promise<number>} 1 if the timeout was set, 0 if key does not exist
 */
export const pexpire = withErrorHandling(async (client, key, milliseconds) => {
  validateKey(key);
  return await client.pexpire(key, milliseconds);
});

/**
 * 设置过期时间（秒）
 * @param {Redis} client Redis 客户端
 * @param {string} key 缓存键
 * @param {number} seconds 过期时间（秒）
 * @returns {Promise<number>} 1 if the timeout was set, 0 if key does not exist
 */
export const expire = withErrorHandling(async (client, key, seconds) => {
  validateKey(key);
  return await client.expire(key, seconds);
});

/**
 * 获取过期时间
 * @param {Redis} client Redis 客户端
 * @param {string} key 缓存键
 * @returns {Promise<number>} 过期时间（秒）
 */
export const ttl = withErrorHandling(async (client, key) => {
  validateKey(key);
  return await client.ttl(key);
});

/**
 * 执行批量操作
 * @param {Redis} client Redis 客户端
 * @param {Function} fn 批量操作函数
 * @returns {Promise<Array>} 批量操作结果
 */
export const multi = async (client, fn) => {
  const pipeline = client.multi();
  await fn(pipeline);
  return await pipeline.exec();
};

/**
 * 清理连接
 * @param {Redis} client Redis 客户端
 * @returns {Promise<string>} 'OK' if successful
 */
export const quit = withErrorHandling(async (client) => {
  const result = await client.quit();
  logger.info('Cache connection closed');
  return result;
});

/**
 * 检查连接状态
 * @param {Redis} client Redis 客户端
 * @returns {boolean} 是否已连接
 */
export const isConnected = (client) => client.status === 'ready';

/**
 * 创建缓存客户端及其方法
 * @param {Object} config Redis 配置选项
 * @returns {Promise<Object>} 缓存客户端及其方法
 */
export const createCacheClient = async (config = {}) => {
  const client = await createRedisClient(config);
  
  return {
    client,
    isConnected: () => isConnected(client),
    get: (key) => get(client, key),
    set: (key, value, ttl) => set(client, key, value, ttl),
    del: (key) => del(client, key),
    incr: (key) => incr(client, key),
    pexpire: (key, ms) => pexpire(client, key, ms),
    expire: (key, sec) => expire(client, key, sec),
    ttl: (key) => ttl(client, key),
    multi: (fn) => multi(client, fn),
    quit: () => quit(client)
  };
};

export default {
  createCacheClient
};
