import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('cache');

// Cache middleware
export default () => {
  // Check if cache is enabled
  if (process.env.ENABLE_CACHE !== 'true') {
    logger.info('Cache service is disabled');
    return async (ctx, next) => {
      ctx.state.cache = null;
      await next();
    };
  }

  let client = null;

  return async (ctx, next) => {
    if (!client) {
      try {
        const cache = await import('../lib/cache.js');
        client = cache.default;
        await client.connect();
      } catch (error) {
        logger.error('Failed to initialize cache:', error);
        ctx.state.cache = null;
        await next();
        return;
      }
    }

    ctx.state.cache = client;
    await next();
  };
};
