import { Client } from 'minio';
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('storage');

class Storage {
  constructor(options = {}) {
    this.client = null;
    this.options = {
      endPoint: options.endPoint || process.env.MINIO_ENDPOINT,
      port: parseInt(options.port || process.env.MINIO_PORT || '9000'),
      useSSL: options.useSSL || process.env.MINIO_USE_SSL === 'true',
      accessKey: options.accessKey || process.env.MINIO_ACCESS_KEY,
      secretKey: options.secretKey || process.env.MINIO_SECRET_KEY,
      bucket: options.bucket || process.env.MINIO_BUCKET || 'default'
    };
  }

  async connect() {
    try {
      // 创建 MinIO 客户端
      this.client = new Client({
        endPoint: this.options.endPoint,
        port: this.options.port,
        useSSL: this.options.useSSL,
        accessKey: this.options.accessKey,
        secretKey: this.options.secretKey
      });

      // 检查默认 bucket 是否存在
      const bucketExists = await this.client.bucketExists(this.options.bucket);
      if (!bucketExists) {
        await this.client.makeBucket(this.options.bucket);
        logger.info(`存储桶 ${this.options.bucket} 创建成功`);
      }

      logger.info('存储服务连接成功');
      return this.client;
    } catch (err) {
      logger.error('存储服务连接失败:', err);
      throw err;
    }
  }

  async disconnect() {
    // MinIO 客户端没有显式的关闭方法
    this.client = null;
    logger.info('存储服务已断开连接');
  }

  async putObject(bucket, objectName, stream, metadata = {}) {
    if (!this.client) {
      throw new Error('存储服务未连接');
    }

    try {
      await this.client.putObject(bucket, objectName, stream, metadata);
      logger.info(`文件上传成功: ${bucket}/${objectName}`);
      
      return {
        bucket,
        objectName,
        metadata
      };
    } catch (err) {
      logger.error('文件上传失败:', err);
      throw err;
    }
  }

  async getObject(bucket, objectName) {
    if (!this.client) {
      throw new Error('存储服务未连接');
    }

    try {
      const stream = await this.client.getObject(bucket, objectName);
      logger.info(`文件下载成功: ${bucket}/${objectName}`);
      return stream;
    } catch (err) {
      logger.error('文件下载失败:', err);
      throw err;
    }
  }

  async removeObject(bucket, objectName) {
    if (!this.client) {
      throw new Error('存储服务未连接');
    }

    try {
      await this.client.removeObject(bucket, objectName);
      logger.info(`文件删除成功: ${bucket}/${objectName}`);
    } catch (err) {
      logger.error('文件删除失败:', err);
      throw err;
    }
  }

  async listObjects(bucket, prefix = '', recursive = true) {
    if (!this.client) {
      throw new Error('存储服务未连接');
    }

    try {
      const objects = [];
      const stream = this.client.listObjects(bucket, prefix, recursive);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => objects.push(obj));
        stream.on('error', reject);
        stream.on('end', () => {
          logger.info(`文件列表获取成功，共 ${objects.length} 个文件`);
          resolve(objects);
        });
      });
    } catch (err) {
      logger.error('获取文件列表失败:', err);
      throw err;
    }
  }
}

// 导出类和单例实例
export { Storage };
export default new Storage();
