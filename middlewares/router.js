const Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const logger = require('../lib/logger');

const loadRoutes = () => {
  const router = new Router();
  const componentsPath = path.join(__dirname, '../components');

  try {
    // Read all files in the components directory
    const files = fs.readdirSync(componentsPath);

    files.forEach(file => {
      if (file.endsWith('.js')) {
        const componentPath = path.join(componentsPath, file);
        const component = require(componentPath);
        
        if (typeof component === 'function') {
          component(router);
          logger.info(`Loaded routes from component: ${file}`);
        }
      }
    });
  } catch (error) {
    logger.error('Error loading routes:', error);
  }

  return router.routes();
};

module.exports = { loadRoutes };
