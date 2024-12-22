const Router = require('koa-router');
const router = new Router({ prefix: '/test-middleware' });
const logger = require('../lib/logger');

// Test route for body parser
router.post('/body-parser', async (ctx) => {
  logger.info('Received body:', { body: ctx.request.body });
  ctx.body = {
    status: 'success',
    receivedData: ctx.request.body
  };
});

// Test route for error handler
router.get('/error', async (ctx) => {
  throw new Error('Test error handling');
});

// Test route for CORS (to be tested from a different origin)
router.get('/cors', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: 'CORS is working'
  };
});

module.exports = router;
