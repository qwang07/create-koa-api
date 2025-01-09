import { koaBody } from 'koa-body';
import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('middleware:body-parser');

/**
 * Request body parser middleware configuration
 * Features:
 * - JSON and form data parsing
 * - Single file upload (max 20MB)
 * - Size limits
 * - Error handling
 */
export default koaBody({
  multipart: true,
  
  formidable: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    keepExtensions: true,
    multiples: false, // Only allow single file upload
    onError: (err) => {
      logger.error('File upload error:', err);
      err.status = 413;
      throw err;
    }
  },
  
  parsedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  
  jsonLimit: '1mb',
  formLimit: '1mb',
  textLimit: '1mb',

  onError: (err) => {
    logger.error('Body parsing error:', err);
    if (err.message.includes('maxFileSize')) {
      err.status = 413;
      err.message = 'File too large (max 20MB)';
    }
    throw err;
  }
});
