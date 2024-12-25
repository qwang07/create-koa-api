import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('response');

/**
 * Response handler middleware
 * Features:
 * 1. Request timing and performance monitoring
 * 2. Error handling
 * 3. Response formatting
 * 4. File handling
 */
export default async function responseHandler(ctx, next) {
  // Extend context with response helpers
  ctx.success = (data = null) => {
    ctx.type = 'application/json';
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

    // If response is already handled or is a file, return
    if (!ctx.body || ctx.response.header['content-type']) {
      return;
    }

    // Format JSON response
    ctx.type = 'application/json';
  } catch (err) {
    const ms = Date.now() - start;
    
    // Use error status from error object or default to 500
    ctx.status = err.status || err.statusCode || 500;
    ctx.type = 'application/json';
    
    const errorBody = {
      message: err.message || 'Internal Server Error'
    };

    // Add validation errors if available
    if (err.details) {
      errorBody.details = err.details;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorBody.stack = err.stack;
    }

    ctx.body = errorBody;

    // Log error with timing
    logger.error(`${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms - ${err.message}`);

    // Emit error event for global handling
    ctx.app.emit('error', err, ctx);
  }
}
