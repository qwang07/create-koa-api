const Router = require('koa-router');
const logger = require('../lib/logger');

module.exports = (router) => {
  // Example route
  router.get('/example', async (ctx) => {
    logger.info('Example route accessed');
    ctx.body = {
      status: 'success',
      message: 'Welcome to the example route!',
      timestamp: new Date().toISOString(),
    };
  });
};
