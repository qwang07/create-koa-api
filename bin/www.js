#!/usr/bin/env node

const app = require('../app');
const logger = require('../lib/logger');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
