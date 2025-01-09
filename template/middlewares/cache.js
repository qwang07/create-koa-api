import { createNamespacedLogger } from '../lib/logger.js';
import { createCacheClient } from '../lib/cache.js';

const logger = createNamespacedLogger('middleware:cache');

let cacheClient = null;

// Initialize cache client
if (process.env.ENABLE_CACHE === 'true') {
  try {
    logger.info('Initializing cache client...');
    cacheClient = await createCacheClient();
    logger.info('Cache client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cache client:', error);
    // 如果缓存连接失败，我们应该退出进程
    process.exit(1);
  }
} else {
  logger.info('Cache service is disabled');
}

// Cleanup on process exit
process.once('SIGTERM', async () => {
  if (cacheClient) {
    await cacheClient.quit();
    cacheClient = null;
    logger.info('Cache connection closed');
  }
});

// Cache middleware
export default async (ctx, next) => {
  // 如果缓存服务已启用，检查连接状态
  if (process.env.ENABLE_CACHE === 'true') {
    if (!cacheClient) {
      logger.error('Cache client is not initialized');
      ctx.throw(500, '缓存服务未初始化');
      return;
    }

    if (!cacheClient.isConnected()) {
      logger.error('Cache connection lost, attempting to reconnect...');
      try {
        // 尝试重新连接
        cacheClient = await createCacheClient();
        logger.info('Cache reconnected successfully');
      } catch (error) {
        logger.error('Failed to reconnect to cache:', error);
        ctx.throw(500, '缓存服务连接失败');
        return;
      }
    }

    logger.debug('Injecting cache client into context', {
      connected: cacheClient.isConnected()
    });

    // 注入缓存客户端
    ctx.state.cache = cacheClient;
  } else {
    ctx.state.cache = null;
  }

  await next();
};
