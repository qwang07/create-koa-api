const Koa = require('koa');
const helmet = require('koa-helmet');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const { loadRoutes } = require('./middlewares/router');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./lib/logger');

require('dotenv').config();

const app = new Koa();

// Global error handler
app.use(errorHandler);

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors());

// Body parser
app.use(bodyParser());

// Load routes dynamically
app.use(loadRoutes());

// Error event handler
app.on('error', (err, ctx) => {
  logger.error('Server Error', { error: err.message, stack: err.stack, ctx });
});

module.exports = app;
