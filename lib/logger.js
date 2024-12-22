const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      dirname: 'logs',
    }),
    new winston.transports.File({
      filename: 'combined.log',
      dirname: 'logs',
    }),
  ],
});

// Create a child logger with namespace based on filename
module.exports = new Proxy({}, {
  get: (target, property) => {
    const callerFile = Error().stack.split('\n')[2].match(/\(([^)]+)\)/)[1];
    const namespace = path.basename(callerFile, '.js');
    return logger[property].bind(logger.child({ namespace }));
  },
});
