import Router from 'koa-router';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, statSync } from 'fs';
import { createNamespacedLogger } from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = createNamespacedLogger('router');

const router = new Router();

// Load route files recursively
const componentsDir = join(__dirname, '..', 'components');
const files = readdirSync(componentsDir);

for (const file of files) {
  const fullPath = join(componentsDir, file);
  const stat = statSync(fullPath);
  
  if (stat.isDirectory()) {
    const routeFiles = readdirSync(fullPath);
    for (const routeFile of routeFiles) {
      if (routeFile.endsWith('.js') && !routeFile.endsWith('.test.js')) {
        try {
          const routePath = join(fullPath, routeFile);
          const route = await import('file://' + routePath);
          
          if (route.default?.method && route.default?.path && route.default?.handler) {
            const { method, path, handler, middlewares = [] } = route.default;
            router[method.toLowerCase()](path, ...middlewares, handler);
            logger.info(`Loaded route: ${method.toUpperCase()} ${path}`, { file: routeFile });
          }
        } catch (err) {
          logger.error(`Error loading route file: ${routeFile}`, { error: err.message });
        }
      }
    }
  }
}

export default router;
