const logger = require('../lib/logger');

module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      status: 'error',
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    logger.error('Request Error', {
      status: ctx.status,
      message: err.message,
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
    });

    ctx.app.emit('error', err, ctx);
  }
};
