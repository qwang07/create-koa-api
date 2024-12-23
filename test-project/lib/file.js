// Placeholder for MinIO file storage configuration
const Minio = require('minio');
const logger = require('./logger');

let minioClient;

const initFileStorage = () => {
  if (!process.env.MINIO_ENDPOINT) {
    logger.warn('MinIO endpoint not configured. File storage features will be disabled.');
    return null;
  }

  try {
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });

    logger.info('MinIO client initialized');
    return minioClient;
  } catch (error) {
    logger.error('Failed to initialize MinIO client:', error);
    return null;
  }
};

module.exports = {
  initFileStorage,
  getClient: () => minioClient,
};
