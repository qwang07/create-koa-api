import { Client } from 'minio';
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('storage');

class Storage {
  constructor(options = {}) {
    this.client = null;
    this.options = {
      endPoint: process.env.MINIO_ENDPOINT,
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    };
    this.bucket = process.env.MINIO_BUCKET;
  }

  async connect() {
    try {
      this.client = new Client(this.options);
      await this.client.bucketExists(this.bucket);
      logger.info('Storage service connected successfully');
      return this.client;
    } catch (err) {
      if (err.code === 'AccessDenied') {
        logger.warn('Storage service connected but access denied');
        return this.client;
      }
      logger.error('Storage service connection failed:', err);
      throw err;
    }
  }

  async disconnect() {
    this.client = null;
    logger.info('Storage service disconnected');
  }

  async putObject(objectName, stream, metadata = {}) {
    if (!this.client) {
      throw new Error('Storage service not connected');
    }
    try {
      await this.client.putObject(this.bucket, objectName, stream, metadata);
      logger.info(`File uploaded successfully: ${objectName}`);
      return { bucket: this.bucket, objectName, metadata };
    } catch (err) {
      logger.error('File upload failed:', err);
      throw err;
    }
  }

  async getObject(objectName) {
    if (!this.client) {
      throw new Error('Storage service not connected');
    }
    try {
      const stream = await this.client.getObject(this.bucket, objectName);
      logger.info(`File downloaded successfully: ${objectName}`);
      return stream;
    } catch (err) {
      logger.error('File download failed:', err);
      throw err;
    }
  }

  async removeObject(objectName) {
    if (!this.client) {
      throw new Error('Storage service not connected');
    }
    try {
      await this.client.removeObject(this.bucket, objectName);
      logger.info(`File deleted successfully: ${objectName}`);
    } catch (err) {
      logger.error('File deletion failed:', err);
      throw err;
    }
  }

  async listObjects(prefix = '', recursive = true) {
    if (!this.client) {
      throw new Error('Storage service not connected');
    }
    try {
      const objectsStream = this.client.listObjectsV2(this.bucket, prefix, recursive);
      const objects = [];
      for await (const obj of objectsStream) {
        objects.push(obj);
      }
      return objects;
    } catch (err) {
      logger.error('List objects failed:', err);
      throw err;
    }
  }

  getClient() {
    return this.client;
  }
}

export default new Storage();
