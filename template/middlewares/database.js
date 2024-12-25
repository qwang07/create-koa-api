import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('database');

let client = null;
// Initialize database connection
if (process.env.ENABLE_DATABASE === 'true') {
  try {
    const { default: db } = await import('../lib/db.js');
    await db.connect();
    client = db.getPrismaClient();
  } catch (error) {
    logger.error('Failed to initialize database:', error);
  }
} else {
  logger.info('Database service is disabled');
}

// Database middleware
export default async (ctx, next) => {
  ctx.state.db = client;
  await next();
};
