import { koaBody } from 'koa-body';
import { createNamespacedLogger } from '../lib/logger.js';

const logger = createNamespacedLogger('body-parser');

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
  },
  
  parsedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  
  jsonLimit: '1mb',
  formLimit: '1mb',
  textLimit: '1mb',

  onError: (err, ctx) => {
    let status = 400;
    let message = 'Bad Request';
    
    if (err.status === 413 || err.message.includes('maxFileSize')) {
      status = 413;
      message = 'File too large (max 20MB)';
      logger.error(`${ctx.method} ${ctx.url} ${status} - ${message}`);
    } else {
      logger.error(`${ctx.method} ${ctx.url} ${status} - ${err.message}`);
    }
    
    ctx.status = status;
    ctx.body = { message };
    ctx.app.emit('error', err, ctx);
  }
});
