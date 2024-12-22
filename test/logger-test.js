const logger = require('../lib/logger');

// Test different log levels
logger.info('Testing info level logging');
logger.error('Testing error level logging', { error: new Error('Test error') });
logger.warn('Testing warn level logging with metadata', { 
  user: 'test-user',
  action: 'test-action'
});

// Test logging with complex metadata
logger.info('Testing metadata handling', {
  request: {
    method: 'POST',
    path: '/api/test',
    headers: {
      'content-type': 'application/json'
    }
  },
  response: {
    status: 200,
    body: {
      success: true
    }
  }
});
