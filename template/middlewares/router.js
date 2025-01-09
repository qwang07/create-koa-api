import Router from 'koa-router';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, statSync } from 'fs';
import { createNamespacedLogger } from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = createNamespacedLogger('router');
const router = new Router();

// 递归加载路由文件
async function loadRoutesFromDir(dir, routes = [], parentComponent = '') {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // 递归处理子目录
      const componentName = parentComponent 
        ? `${parentComponent}/${file}`
        : file;
      await loadRoutesFromDir(fullPath, routes, componentName);
    } else if (file.endsWith('.route.js') && !file.endsWith('.test.js')) {
      try {
        // 动态导入路由文件
        const route = await import('file://' + fullPath);
        if (!route.default?.path) {
          logger.error(`Invalid route file: ${fullPath} - missing path`);
          process.exit(1);
        }

        const { method, path, middlewares = [], handler } = route.default;
        
        if (!method || !handler) {
          logger.error(`Invalid route file: ${fullPath} - missing method or handler`);
          process.exit(1);
        }

        // 注册路由
        router[method.toLowerCase()](path, ...middlewares, handler);

        // 记录路由信息
        routes.push({
          method,
          path,
          component: parentComponent,
          file
        });
      } catch (err) {
        logger.error('Failed to load route file:', {
          file: fullPath,
          error: err.message,
          stack: err.stack
        });
        process.exit(1);
      }
    }
  }

  return routes;
}

// 初始化路由
export async function initializeRoutes() {
  const componentsDir = join(__dirname, '..', 'components');
  const routes = await loadRoutesFromDir(componentsDir);

  // 按组件和路径排序
  routes.sort((a, b) => {
    // 先按组件名排序
    if (a.component !== b.component) {
      return a.component.localeCompare(b.component);
    }
    // 组件名相同时按路径排序
    return a.path.localeCompare(b.path);
  });

  // 输出路由日志
  logger.info('Registered routes:');
  for (const { method, path, component, file } of routes) {
    logger.info(`${method.toUpperCase().padEnd(6)} ${path.padEnd(40)} [${component}/${file}]`);
  }

  logger.info(`Total routes: ${routes.length}`);

  return router;
}

export default router;
