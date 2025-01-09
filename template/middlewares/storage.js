import { createNamespacedLogger } from '../lib/logger.js';
import { createStorage } from '../lib/storage.js';

const logger = createNamespacedLogger('middleware:storage');

let storageClient = null;

// Initialize storage connection
if (process.env.ENABLE_FILE_SERVICE === 'true') {
  try {
    logger.info('Initializing storage service...');
    storageClient = await createStorage();
    logger.info('Storage service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize storage service:', error);
    // 如果存储服务连接失败，我们应该退出进程
    process.exit(1);
  }
} else {
  logger.info('Storage service is disabled');
}

// Cleanup on process exit
process.once('SIGTERM', async () => {
  // MinIO 客户端没有需要清理的资源
  storageClient = null;
  logger.info('Storage service connection cleared');
});

// Storage middleware
export default async (ctx, next) => {
  if (process.env.ENABLE_FILE_SERVICE === 'true') {
    if (!storageClient) {
      logger.error('Storage client is not initialized');
      ctx.throw(500, 'Storage service is not initialized');
      return;
    }

    logger.debug('Injecting storage client into context');
    ctx.state.storage = storageClient;
  } else {
    ctx.state.storage = null;
  }

  await next();
};
