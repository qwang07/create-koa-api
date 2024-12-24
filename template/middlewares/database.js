import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('database');

// Database middleware
export default () => {
  // Check if database is enabled
  if (process.env.ENABLE_DATABASE !== 'true') {
    logger.info('Database service is disabled');
    return async (ctx, next) => {
      ctx.state.db = null;
      await next();
    };
  }

  let client = null;

  return async (ctx, next) => {
    if (!client) {
      try {
        const db = await import('../lib/db.js');
        client = db.default;
      } catch (error) {
        logger.error('Failed to initialize database:', error);
        ctx.state.db = null;
        await next();
        return;
      }
    }

    ctx.state.db = client;
    await next();
  };
};
