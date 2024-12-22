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
        
        // Handle both function-style and router-instance-style components
        if (typeof component === 'function') {
          component(router);
        } else if (component.routes && component.allowedMethods) {
          // Component is a router instance
          router.use(component.routes());
          router.use(component.allowedMethods());
        }
        logger.info(`Loaded routes from component: ${file}`);
      }
    });
  } catch (error) {
    logger.error('Error loading routes:', error);
  }

  return router.routes();
};

module.exports = { loadRoutes };
