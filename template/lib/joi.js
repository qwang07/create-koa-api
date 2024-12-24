import Joi from 'joi';
import { db } from './db.js';

/**
 * 创建数据库表验证扩展
 * @param {Object} db - 数据库连接或查询接口
 */
const createDbExtension = (db) => ({
  type: 'table',
  base: Joi.string(),
  messages: {
    'table.exists': '{{#label}} does not exist in {{#table}}',
    'table.unique': '{{#label}} already exists in {{#table}}'
  },
  rules: {
    exists: {
      method(table, options = {}) {
        return this.$_addRule({ name: 'exists', args: { table, options } });
      },
      async validate(value, helpers, { table, options }) {
        try {
          const result = await db[table].findUnique({
            where: { [options.field || 'id']: value }
          });
          if (!result) {
            return helpers.error('table.exists', { table });
          }
          return value;
        } catch (err) {
          return helpers.error('table.exists', { table });
        }
      }
    },
    unique: {
      method(table, options = {}) {
        return this.$_addRule({ name: 'unique', args: { table, options } });
      },
      async validate(value, helpers, { table, options }) {
        try {
          const where = { [options.field || helpers.state.path]: value };
          // 如果是更新操作，排除当前记录
          if (options.exclude) {
            where.id = { not: options.exclude };
          }
          const result = await db[table].findFirst({ where });
          if (result) {
            return helpers.error('table.unique', { table });
          }
          return value;
        } catch (err) {
          return helpers.error('table.unique', { table });
        }
      }
    }
  }
});

// 创建 Joi 实例，如果启用了数据库则添加数据库扩展
const joi = process.env.ENABLE_DATABASE === 'true' && db
  ? Joi.extend(createDbExtension(db))
  : Joi;

export default joi;
