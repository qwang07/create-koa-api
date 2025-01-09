import Koa from 'koa';
import { createNamespacedLogger } from './lib/logger.js';
import responseHandler from './middlewares/responseHandler.js';
import cors from './middlewares/cors.js';
import bodyParser from './middlewares/bodyParser.js';
import helmet from './middlewares/helmet.js';
import compression from './middlewares/compression.js';
import { swaggerUI, serveSwaggerSpecs } from './middlewares/swagger.js';
import { rateLimiter } from './middlewares/security.js';
import database from './middlewares/database.js';
import cache from './middlewares/cache.js';
import storage from './middlewares/storage.js';
import { initializeRoutes } from './middlewares/router.js';

// Create logger instance
const logger = createNamespacedLogger('app');
const app = new Koa();

// Global error handler
app.on('error', (err, ctx) => {
  logger.error('Uncaught application error:', { 
    error: err.message, 
    stack: err.stack
  });
});

// Global middleware
app.use(responseHandler);
app.use(database);
app.use(cache);
app.use(storage);
app.use(helmet);
app.use(cors);
app.use(compression);
app.use(bodyParser);
app.use(rateLimiter);

// API documentation (enabled only in non-production environments)
if (process.env.NODE_ENV !== 'production') {
  app.use(serveSwaggerSpecs);
  app.use(swaggerUI);
}

// Initialize routes
try {
  const router = await initializeRoutes();
  app.use(router.routes());
  app.use(router.allowedMethods());
} catch (err) {
  logger.error('Failed to initialize routes:', err);
  process.exit(1);
}

logger.info('Application initialized successfully');

export default app;
