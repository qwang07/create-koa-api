import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('storage');

// Storage middleware
export default () => {
  // Check if storage is enabled
  if (process.env.ENABLE_FILE_SERVICE !== 'true') {
    logger.info('Storage service is disabled');
    return async (ctx, next) => {
      ctx.state.storage = null;
      await next();
    };
  }

  let client = null;

  return async (ctx, next) => {
    if (!client) {
      try {
        const storage = await import('../lib/storage.js');
        client = storage.default;
        await client.connect();
      } catch (error) {
        logger.error('Failed to initialize storage:', error);
        ctx.state.storage = null;
        await next();
        return;
      }
    }

    ctx.state.storage = client;
    await next();
  };
};
