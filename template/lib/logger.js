import winston from 'winston';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 自定义格式
const customFormat = winston.format.printf(({ level, message, timestamp, namespace = 'app', ...metadata }) => {
  // 格式化时间戳
  const ts = new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // 格式化元数据
  let meta = '';
  if (Object.keys(metadata).length > 0) {
    meta = JSON.stringify(metadata);
  }
  
  // 返回格式化的日志
  return `${ts} [${namespace}] ${level}: ${message}${meta ? ' ' + meta : ''}`;
});

// 默认配置
const defaultConfig = {
  // 日志级别
  level: process.env.LOG_LEVEL || 'info',
  // 是否启用文件日志
  enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
  // 日志目录
  logDir: process.env.LOG_DIR || 'logs',
  // 日志格式
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  // 控制台格式
  consoleFormat: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    customFormat
  )
};

// 创建日志目录
function createLogDir(logPath) {
  if (!existsSync(logPath)) {
    mkdirSync(logPath, { recursive: true });
  }
}

// 创建 logger 实例
function createLogger(config = {}) {
  // 合并配置
  const finalConfig = { ...defaultConfig, ...config };
  
  // 基础传输器（控制台）
  const transports = [
    new winston.transports.Console({
      format: finalConfig.consoleFormat
    })
  ];

  // 如果启用文件日志
  if (finalConfig.enableFileLogging) {
    const logDir = join(process.cwd(), finalConfig.logDir);
    createLogDir(logDir);
    
    // 错误日志
    transports.push(
      new winston.transports.File({
        filename: join(logDir, 'error.log'),
        level: 'error',
        format: finalConfig.format
      })
    );
    
    // 组合日志
    transports.push(
      new winston.transports.File({
        filename: join(logDir, 'combined.log'),
        format: finalConfig.format
      })
    );
  }

  return winston.createLogger({
    level: finalConfig.level,
    format: finalConfig.format,
    transports
  });
}

// 创建命名空间 logger
const createNamespacedLogger = (namespace) => {
  const logger = createLogger();
  return {
    info: (message, meta = {}) => logger.info(message, { namespace, ...meta }),
    error: (message, meta = {}) => logger.error(message, { namespace, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { namespace, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { namespace, ...meta })
  };
};

// 导出默认 logger 实例（仅控制台输出）
export default createLogger();

// 导出创建函数，允许用户创建自定义 logger
export {
  createLogger,
  createNamespacedLogger
};
