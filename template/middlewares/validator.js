import { createNamespacedLogger } from '../lib/logger.js';
import { createValidator, localize } from '../lib/validator.js';

const logger = createNamespacedLogger('middleware:validator');

// 创建验证器实例
const validator = createValidator({
  enableRef: process.env.ENABLE_DATABASE === 'true'
});

// 格式化验证错误
const formatValidationError = (errors) => {
  if (!errors || !errors.length) {
    return [{
      field: 'unknown',
      message: '验证失败'
    }];
  }

  // 本地化错误消息
  localize.zh(errors);

  return errors.map(error => ({
    field: error.instancePath.slice(1) || error.params?.missingProperty || error.params?.ref?.id || 'value',
    message: (error.message || '验证失败').replace(/"/g, '') // 移除多余的引号
  }));
};

/**
 * 创建验证中间件
 * @param {Object} schema 验证模式
 * @param {Object} [schema.params] 路径参数验证模式
 * @param {Object} [schema.query] 查询参数验证模式
 * @param {Object} [schema.body] 请求体验证模式
 * @returns {Function} Koa 中间件
 */
export default (schema) => {
  if (!schema) {
    throw new Error('Schema is required');
  }

  // 预编译 schema
  const validateParams = schema.params ? validator.compile(schema.params) : null;
  const validateQuery = schema.query ? validator.compile(schema.query) : null;
  const validateBody = schema.body ? validator.compile(schema.body) : null;

  return async (ctx, next) => {
    const { params, query } = ctx;
    const { body } = ctx.request;
    const { db } = ctx.state;

    logger.info('开始验证请求', {
      hasDb: !!db,
      params,
      query,
      body
    });

    try {
      // 验证路径参数
      if (validateParams) {
        logger.info('验证路径参数');
        const result = await validateParams(params, db);
        if (!result.valid) {
          logger.warn('路径参数验证失败', { errors: result.errors });
          ctx.throw(422, '路径参数验证失败', { details: formatValidationError(result.errors) });
        }
        ctx.params = result.data;
      }

      // 验证查询参数
      if (validateQuery) {
        logger.info('验证查询参数');
        const result = await validateQuery(query, db);
        if (!result.valid) {
          logger.warn('查询参数验证失败', { errors: result.errors });
          ctx.throw(422, '查询参数验证失败', { details: formatValidationError(result.errors) });
        }
        ctx.query = result.data;
      }

      // 验证请求体
      if (validateBody) {
        logger.info('验证请求体');
        const result = await validateBody(body, db);
        if (!result.valid) {
          logger.warn('请求体验证失败', { errors: result.errors });
          ctx.throw(422, '请求体验证失败', { details: formatValidationError(result.errors) });
        }
        ctx.request.body = result.data;
      }
    } catch (error) {
      logger.error('验证过程出错', { error });
      if (error.validation) {
        ctx.throw(422, '请求验证失败', { details: formatValidationError(error.errors) });
      }
      throw error;
    }

    await next();
  };
};
