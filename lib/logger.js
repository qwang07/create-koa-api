const winston = require('winston');
const path = require('path');

// Format error objects
const formatError = (error) => {
  if (!(error instanceof Error)) return error;
  return {
    message: error.message,
    stack: error.stack,
    ...error
  };
};

// Custom format for log messages
const customFormat = winston.format.printf(({ level, message, namespace, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${namespace}:${level}]: ${message}`;
  
  // Handle error objects in metadata
  if (metadata.error) {
    metadata.error = formatError(metadata.error);
  }
  
  // Add metadata if present (excluding service)
  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }
  
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DDTHH:mm:ss'
    }),
    customFormat
  ),
  defaultMeta: { service: 'api-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
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
