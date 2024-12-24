import Koa from 'koa';
import { config } from 'dotenv';
import { createNamespacedLogger } from './lib/logger.js';
import responseHandler from './middlewares/responseHandler.js';
import cors from './middlewares/cors.js';
import bodyParser from './middlewares/bodyParser.js';
import helmet from './middlewares/helmet.js';
import router from './middlewares/router.js';
import { swaggerUI, serveSwaggerSpecs } from './middlewares/swagger.js';
import { rateLimiter } from './middlewares/security.js';
import database from './middlewares/database.js';
import cache from './middlewares/cache.js';
import storage from './middlewares/storage.js';

// Create logger instance
const logger = createNamespacedLogger('app');

// Load environment variables
config();

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
app.use(helmet);
app.use(cors);
app.use(bodyParser);
app.use(rateLimiter);
app.use(database());
app.use(cache());
app.use(storage());

// API documentation (enabled only in non-production environments)
if (process.env.NODE_ENV !== 'production') {
  app.use(serveSwaggerSpecs);
  app.use(swaggerUI);
}

// Routes
app.use(router.routes());
app.use(router.allowedMethods());

logger.info('Application initialized successfully');

export default app;
