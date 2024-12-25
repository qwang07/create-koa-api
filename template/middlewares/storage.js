import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('storage');

let client = null;

// Initialize storage connection
if (process.env.ENABLE_FILE_SERVICE === 'true') {
  try {
    const storage = await import('../lib/storage.js');
    client = storage.default;
    await client.connect();
  } catch (error) {
    logger.error('Failed to initialize storage:', error);
  }
} else {
  logger.info('Storage service is disabled');
}

// Storage middleware
export default async (ctx, next) => {
  ctx.state.storage = client;
  await next();
};
