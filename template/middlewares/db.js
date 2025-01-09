import { createNamespacedLogger } from '../lib/logger.js';
import createDatabase from '../lib/db.js';

const logger = createNamespacedLogger('middleware:db');

let db = null;

// 初始化数据库连接
if (process.env.ENABLE_DATABASE === 'true') {
  try {
    db = await createDatabase();
  } catch (error) {
    logger.error('初始化数据库中间件失败:', error);
  }
} else {
  logger.info('数据库服务已禁用');
}

// 清理函数
process.once('SIGTERM', async () => {
  if (db) {
    await db.disconnect();
    db = null;
  }
});

// 数据库中间件
export default async (ctx, next) => {
  ctx.state.db = db?.client;
  await next();
};
