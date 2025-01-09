import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('middleware:response');

/**
 * Response handler middleware
 * Features:
 * 1. Request timing and performance monitoring
 * 2. Error handling (500 errors only)
 * 3. Response formatting (text/json)
 * 4. File handling
 */
export default async function responseHandler(ctx, next) {
  // Extend context with response helpers
  ctx.success = (data = null) => {
    // 如果是字符串且不是 JSON 格式，则作为纯文本返回
    if (typeof data === 'string' && !/^[\[\{]/.test(data)) {
      ctx.type = 'text/plain';
    } else {
      ctx.type = 'application/json';
    }
    ctx.body = data;
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

    // Add response time header
    ctx.set('X-Response-Time', `${ms}ms`);

    // Log request with timing
    const logMessage = `${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms ${ctx.response.length || 0}b`;
    
    // Log slow requests with memory usage
    if (ms > 1000) {
      const memory = process.memoryUsage();
      logger.warn(`${logMessage} - Slow request`, {
        memory: {
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
          rss: Math.round(memory.rss / 1024 / 1024) + 'MB'
        }
      });
    } else {
      logger.info(logMessage);
    }

    // 如果响应已经被处理或是文件流，直接返回
    if (!ctx.body || ctx.response.header['content-type']) {
      return;
    }

    // 使用 success 处理响应
    ctx.success(ctx.body);

  } catch (err) {
    const ms = Date.now() - start;
    
    // Add response time header
    ctx.set('X-Response-Time', `${ms}ms`);
    
    // 处理所有错误
    ctx.type = 'application/json';
    
    // 根据错误类型设置状态码和响应体
    if (!err.status || err.status === 500) {
      ctx.status = 500;
      ctx.body = {
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal Server Error'
          : err.message
      };

      // 在开发环境添加堆栈信息
      if (process.env.NODE_ENV === 'development') {
        ctx.body.stack = err.stack;
      }

      // 记录详细错误日志
      logger.error(`${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms - ${err.message}`, {
        error: err.message,
        stack: err.stack
      });
    } else {
      // 处理其他错误（如验证错误、404等）
      ctx.status = err.status;
      ctx.body = {
        error: err.message,
        ...(err.status === 422 && err.details && { details: err.details })
      };

      // 记录业务错误日志
      logger.warn(`${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms - ${err.message}`, {
        error: err.message,
        ...(err.status === 422 && err.details && { details: err.details })
      });
    }
  }
}
