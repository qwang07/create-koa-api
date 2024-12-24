import joi from '../lib/joi.js';

/**
 * 创建验证中间件
 * @param {Object} schema - Joi schema 对象，包含 params, query, body 的验证规则
 * @param {Object} options - 验证选项
 * @returns {Function} Koa 中间件
 */
const validator = (schema, options = {}) => {
  return async (ctx, next) => {
    try {
      // 只验证 schema 中定义的部分
      if (schema.params) {
        ctx.params = await joi.object(schema.params)
          .validateAsync(ctx.params, { 
            ...options,
            context: { ctx } // 传入 ctx 以便在自定义验证中使用
          });
      }
      if (schema.query) {
        ctx.query = await joi.object(schema.query)
          .validateAsync(ctx.query, {
            ...options,
            context: { ctx }
          });
      }
      if (schema.body) {
        ctx.request.body = await joi.object(schema.body)
          .validateAsync(ctx.request.body, {
            ...options,
            context: { ctx }
          });
      }

      await next();
    } catch (err) {
      if (err.isJoi) {
        ctx.throw(400, err.details[0].message);
      }
      throw err;
    }
  };
};

/**
 * 创建数据库引用验证规则
 * @param {string} model - 模型名称（如 'user', 'post' 等）
 * @param {Function} findById - 根据 ID 查找记录的函数
 * @param {Object} options - 其他选项
 * @returns {Object} Joi 验证规则
 */
const ref = (model, findById, options = {}) => {
  const { required = true, message } = options;
  
  let rule = Joi.string().custom(async (value, helpers) => {
    const { ctx } = helpers.prefs.context;
    
    try {
      const record = await findById(value);
      if (!record) {
        throw new Error();
      }
      // 将找到的记录存储在 ctx.state 中，以便后续使用
      ctx.state[model] = record;
      return value;
    } catch (err) {
      throw new Error(message || `Invalid ${model} ID`);
    }
  }).messages({
    'string.empty': `${model} ID is required`,
    'any.required': `${model} ID is required`,
  });
  
  if (required) {
    rule = rule.required();
  }
  return rule;
};

// 默认导出
export default validator;

// 命名导出
export const validate = validator;
export { ref };
