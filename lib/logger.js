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
const getNamespace = () => {
  try {
    const stack = Error().stack || '';
    const stackLines = stack.split('\n');
    const callerLine = stackLines[3] || stackLines[2] || stackLines[1];
    if (!callerLine) return 'unknown';
    
    const match = callerLine.match(/(?:at\s+.*\s+\()?([^:]+)\.js/);
    return match ? path.basename(match[1]) : 'unknown';
  } catch (error) {
    return 'unknown';
  }
};

module.exports = new Proxy({}, {
  get: (target, property) => {
    if (typeof logger[property] !== 'function') {
      return logger[property];
    }
    const namespace = getNamespace();
    return logger[property].bind(logger.child({ namespace }));
  },
});
