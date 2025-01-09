import winston from 'winston';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

// Pure function: Format timestamp
const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

// Pure function: Format metadata
const formatMetadata = (metadata) => 
  Object.keys(metadata).length > 0 ? ' ' + JSON.stringify(metadata) : '';

// Pure function: Create log format
const createLogFormat = ({ level, message, timestamp, namespace = 'app', ...metadata }) => 
  `${formatTimestamp(timestamp)} [${namespace}] ${level}: ${message}${formatMetadata(metadata)}`;

// Pure function: Create custom format
const createCustomFormat = () => winston.format.printf(createLogFormat);

// Pure function: Ensure log directory exists
const ensureLogDir = (logPath) => {
  if (!existsSync(logPath)) {
    mkdirSync(logPath, { recursive: true });
  }
  return logPath;
};

// Pure function: Create console transport
const createConsoleTransport = () => new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    createCustomFormat()
  )
});

// Pure function: Create file transport
const createFileTransport = (logDir, level) => new winston.transports.File({
  filename: join(logDir, `${level}.log`),
  level: level === 'combined' ? undefined : level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// Pure function: Get config
const getConfig = (config) => ({
  level: config.level || process.env.LOG_LEVEL || 'info',
  enableFileLogging: config.enableFileLogging || process.env.ENABLE_FILE_LOGGING === 'true' || false,
  logDir: config.logDir || process.env.LOG_DIR || 'logs'
});

// Pure function: Create transports
const createTransports = (config) => {
  const transports = [createConsoleTransport()];
  
  if (config.enableFileLogging) {
    const logDir = ensureLogDir(join(process.cwd(), config.logDir));
    return [
      ...transports,
      createFileTransport(logDir, 'error'),
      createFileTransport(logDir, 'combined')
    ];
  }
  
  return transports;
};

/**
 * Create logger instance
 * @param {Object} config Configuration options
 * @returns {Object} winston logger instance
 */
export const createLogger = (config = {}) => {
  const finalConfig = getConfig(config);
  
  return winston.createLogger({
    level: finalConfig.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: createTransports(finalConfig)
  });
};

/**
 * Create namespaced logger
 * @param {string} namespace Namespace
 * @param {Object} config Logger configuration
 * @returns {Object} Namespaced logger instance
 */
export const createNamespacedLogger = (namespace, config = {}) => {
  const logger = createLogger(config);
  
  // Curried log method
  const createLogMethod = (level) => (message, meta = {}) => 
    logger[level](message, { namespace, ...meta });
  
  return {
    info: createLogMethod('info'),
    error: createLogMethod('error'),
    warn: createLogMethod('warn'),
    debug: createLogMethod('debug')
  };
};
