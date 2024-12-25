import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('cache');

let client = null;

// Initialize cache connection
if (process.env.ENABLE_CACHE === 'true') {
  try {
    const cache = await import('../lib/cache.js');
    client = cache.default;
    await client.connect();
  } catch (error) {
    logger.error('Failed to initialize cache:', error);
  }
} else {
  logger.info('Cache service is disabled');
}

// Cache middleware
export default async (ctx, next) => {
  ctx.state.cache = client;
  await next();
};
