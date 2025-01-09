import { Client } from 'minio';
import { createNamespacedLogger } from './logger.js';
import { createReadStream } from 'fs';
import { stat as fsStat } from 'fs/promises';

const logger = createNamespacedLogger('lib:storage');

// 纯函数：创建配置
const createConfig = (config = {}) => ({
  endPoint: config.endPoint || process.env.MINIO_ENDPOINT,
  port: parseInt(config.port || process.env.MINIO_PORT || '9000'),
  useSSL: config.useSSL || process.env.MINIO_USE_SSL === 'true',
  accessKey: config.accessKey || process.env.MINIO_ACCESS_KEY,
  secretKey: config.secretKey || process.env.MINIO_SECRET_KEY
});

// 纯函数：验证客户端
const validateClient = (client) => {
  if (!client) {
    throw new Error('Storage client not provided');
  }
  return client;
};

/**
 * 创建 Minio 客户端
 * @param {Object} config Minio 配置选项
 * @returns {Promise<Object>} Minio 客户端实例
 */
export const createMinioClient = async (config = {}) => {
  const options = createConfig(config);
  const client = new Client(options);
  const bucket = config.bucket || process.env.MINIO_BUCKET;

  try {
    await client.bucketExists(bucket);
    logger.info('Storage service connected successfully');
    return client;
  } catch (err) {
    if (err.code === 'AccessDenied') {
      logger.warn('Storage service connected but access denied');
      return client;
    }
    logger.error('Storage service connection failed:', err);
    throw err;
  }
};

// 柯里化的错误处理函数
const withErrorHandling = (operation) => async (...args) => {
  try {
    return await operation(...args);
  } catch (err) {
    logger.error(`${operation.name} operation failed:`, err);
    throw err;
  }
};

// 纯函数：处理对象路径
const processObjectPath = (objectPath) => {
  // 移除开头的斜杠
  const path = objectPath.replace(/^\/+/, '');
  // 如果路径中包含目录分隔符，则分离目录和文件名
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return { prefix: '', objectName: path };
  }
  return {
    prefix: path.substring(0, lastSlashIndex),
    objectName: path.substring(lastSlashIndex + 1)
  };
};

/**
 * 上传对象
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} objectPath 对象路径（包含目录）
 * @param {Stream|string} input 数据流或文件路径
 * @param {Object} metadata 元数据
 * @returns {Promise<Object>} 上传结果
 */
export const putObject = withErrorHandling(async (client, bucket, objectPath, input, metadata = {}) => {
  validateClient(client);
  const { prefix, objectName } = processObjectPath(objectPath);
  const fullObjectName = prefix ? `${prefix}/${objectName}` : objectName;

  // 如果 input 是字符串，则认为是文件路径
  if (typeof input === 'string') {
    const fileStat = await fsStat(input);
    const stream = createReadStream(input);
    await client.putObject(bucket, fullObjectName, stream, fileStat.size, metadata);
  } else {
    await client.putObject(bucket, fullObjectName, input, metadata);
  }

  logger.info(`File uploaded successfully: ${fullObjectName}`);
  return { bucket, objectName: fullObjectName, metadata };
});

/**
 * 下载对象
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} objectPath 对象路径（包含目录）
 * @returns {Promise<Stream>} 数据流
 */
export const getObject = withErrorHandling(async (client, bucket, objectPath) => {
  validateClient(client);
  const { prefix, objectName } = processObjectPath(objectPath);
  const fullObjectName = prefix ? `${prefix}/${objectName}` : objectName;
  const stream = await client.getObject(bucket, fullObjectName);
  logger.info(`File downloaded successfully: ${fullObjectName}`);
  return stream;
});

/**
 * 删除对象
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} objectPath 对象路径（包含目录）
 * @returns {Promise<void>}
 */
export const removeObject = withErrorHandling(async (client, bucket, objectPath) => {
  validateClient(client);
  const { prefix, objectName } = processObjectPath(objectPath);
  const fullObjectName = prefix ? `${prefix}/${objectName}` : objectName;
  await client.removeObject(bucket, fullObjectName);
  logger.info(`File deleted successfully: ${fullObjectName}`);
});

/**
 * 列出对象
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} prefix 前缀
 * @param {boolean} recursive 是否递归
 * @returns {Promise<Array>} 对象列表
 */
export const listObjects = withErrorHandling(async (client, bucket, prefix = '', recursive = true) => {
  validateClient(client);
  const objectsStream = client.listObjectsV2(bucket, prefix, recursive);
  const objects = [];
  for await (const obj of objectsStream) {
    objects.push(obj);
  }
  return objects;
});

/**
 * 获取对象状态
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} objectPath 对象路径（包含目录）
 * @returns {Promise<Object>} 对象状态
 */
export const stat = withErrorHandling(async (client, bucket, objectPath) => {
  validateClient(client);
  const { prefix, objectName } = processObjectPath(objectPath);
  const fullObjectName = prefix ? `${prefix}/${objectName}` : objectName;
  const stat = await client.statObject(bucket, fullObjectName);
  return {
    size: stat.size,
    lastModified: stat.lastModified,
    metadata: stat.metaData || {}
  };
});

/**
 * 移动对象
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} sourceObjectPath 源对象路径（包含目录）
 * @param {string} targetObjectPath 目标对象路径（包含目录）
 * @returns {Promise<void>}
 */
export const moveObject = withErrorHandling(async (client, bucket, sourceObjectPath, targetObjectPath) => {
  validateClient(client);
  const source = processObjectPath(sourceObjectPath);
  const target = processObjectPath(targetObjectPath);
  
  const sourceFullName = source.prefix ? `${source.prefix}/${source.objectName}` : source.objectName;
  const targetFullName = target.prefix ? `${target.prefix}/${target.objectName}` : target.objectName;
  
  await client.copyObject(bucket, targetFullName, `${bucket}/${sourceFullName}`);
  await client.removeObject(bucket, sourceFullName);
  logger.info(`File moved successfully from ${sourceFullName} to ${targetFullName}`);
});

/**
 * 删除文件夹及其内容
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} folderPath 文件夹路径
 * @returns {Promise<void>}
 */
export const removeFolder = withErrorHandling(async (client, bucket, folderPath) => {
  validateClient(client);
  // 确保路径以 / 结尾，这样才能正确匹配文件夹下的所有文件
  const prefix = folderPath.replace(/\/*$/, '/');
  const objectsStream = client.listObjectsV2(bucket, prefix, true);
  
  const objectsList = [];
  for await (const obj of objectsStream) {
    objectsList.push(obj.name);
  }
  
  if (objectsList.length > 0) {
    await client.removeObjects(bucket, objectsList);
  }
  
  logger.info(`Folder deleted successfully: ${prefix}`);
});

/**
 * 测试直接删除文件夹
 * @param {Object} client Minio 客户端实例
 * @param {string} bucket 存储桶名称
 * @param {string} folderPath 文件夹路径
 * @returns {Promise<void>}
 */
export const testRemoveFolder = withErrorHandling(async (client, bucket, folderPath) => {
  validateClient(client);
  // 确保路径以 / 结尾
  const prefix = folderPath.replace(/\/*$/, '/');
  
  // 先列出所有文件
  logger.info('Listing files before removal:');
  const beforeList = client.listObjectsV2(bucket, prefix, true);
  for await (const obj of beforeList) {
    logger.info(`- ${obj.name}`);
  }
  
  // 尝试直接删除文件夹
  try {
    await client.removeObject(bucket, prefix);
    logger.info('Direct folder removal completed');
  } catch (err) {
    logger.error('Direct folder removal failed:', err);
  }
  
  // 再次列出所有文件
  logger.info('Listing files after removal:');
  const afterList = client.listObjectsV2(bucket, prefix, true);
  for await (const obj of afterList) {
    logger.info(`- ${obj.name}`);
  }
});

// 柯里化的方法创建函数
const createMethod = (client, bucket) => (method) => (...args) => 
  method(client, bucket, ...args);

// 纯函数：创建进程事件处理器
const createProcessHandlers = (client) => ({
  beforeExit: async () => {
    logger.info('Cleaning up storage connection before exit');
    await quit(client);
  },
  SIGINT: async () => {
    logger.info('Received SIGINT signal, cleaning up storage connection');
    await quit(client);
    process.exit(0);
  },
  SIGTERM: async () => {
    logger.info('Received SIGTERM signal, cleaning up storage connection');
    await quit(client);
    process.exit(0);
  }
});

// 纯函数：设置进程事件
const setupProcessEvents = (handlers) => {
  Object.entries(handlers).forEach(([event, handler]) => {
    process.on(event, handler);
  });
};

/**
 * 清理连接
 * @param {Object} client Minio 客户端实例
 * @returns {Promise<void>}
 */
export const quit = async (client) => {
  validateClient(client);
  // Minio 客户端没有需要特别清理的资源，但我们记录一下
  logger.info('Storage connection closed');
};

/**
 * 创建存储实例
 * @param {Object} config 配置选项
 * @returns {Promise<Object>} 存储实例接口
 */
export const createStorage = async (config = {}) => {
  const client = await createMinioClient(config);
  const bucket = config.bucket || process.env.MINIO_BUCKET;
  const createStorageMethod = createMethod(client, bucket);

  // 设置进程事件处理
  setupProcessEvents(createProcessHandlers(client));

  return {
    putObject: createStorageMethod(putObject),
    getObject: createStorageMethod(getObject),
    removeObject: createStorageMethod(removeObject),
    listObjects: createStorageMethod(listObjects),
    stat: createStorageMethod(stat),
    moveObject: createStorageMethod(moveObject),
    removeFolder: createStorageMethod(removeFolder),
    testRemoveFolder: createStorageMethod(testRemoveFolder),
    getClient: () => client
  };
};

export default createStorage;
