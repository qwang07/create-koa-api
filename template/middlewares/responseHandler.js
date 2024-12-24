import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('response');

/**
 * 统一响应处理中间件
 * 包含：
 * 1. 请求计时
 * 2. 错误处理
 * 3. 响应格式化
 * 4. 文件处理
 */
export default async function responseHandler(ctx, next) {
  // 扩展 ctx，添加便捷的响应方法
  ctx.success = (data, message) => {
    ctx.type = 'application/json';
    ctx.body = message ? { data, message } : data;
  };

  ctx.file = (filename, stream, mimeType) => {
    ctx.attachment(filename);
    if (mimeType) {
      ctx.type = mimeType;
    }
    ctx.body = stream;
  };

  const start = Date.now();
  
  try {
    await next();
    const ms = Date.now() - start;
    logger.info(`${ctx.method} ${ctx.url} - ${ms}ms`);

    // 如果没有响应体或已经设置了 Content-Type，直接返回
    if (!ctx.body || ctx.response.header['content-type']) {
      return;
    }

    // 默认设置 JSON 响应
    ctx.type = 'application/json';
    if (typeof ctx.body === 'object') {
      // 如果已经是正确格式就不再包装
      if (ctx.body.data !== undefined) {
        return;
      }
      // 包装为标准格式
      ctx.body = { data: ctx.body };
    }
  } catch (err) {
    const ms = Date.now() - start;
    ctx.status = err.status || 500;
    ctx.type = 'application/json';
    
    // 错误响应
    ctx.body = {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };

    logger.error('Request Error', {
      status: ctx.status,
      message: err.message,
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
      duration: `${ms}ms`
    });

    ctx.app.emit('error', err, ctx);
  }
}
