import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';
import ajvKeywords from 'ajv-keywords';
import ajvLocalize from 'ajv-i18n';
import { createNamespacedLogger } from './logger.js';

const logger = createNamespacedLogger('lib:validator');

// 纯函数：创建数据库查询条件
const createQueryConditions = (data, where = {}) => ({
  where: { 
    id: data,
    ...where
  }
});

// 纯函数：创建数据库查询选项
const createQueryOptions = (conditions, select) => ({
  ...conditions,
  ...(select ? { select } : {})
});

// 纯函数：验证模型和数据库实例
const validateDependencies = (model, db) => {
  if (!model) {
    throw new Error('ref keyword requires model property');
  }
  if (!db) {
    throw new Error('Database instance not available');
  }
};

// 纯函数：处理查询结果
const handleQueryResult = (record, data, select) => ({
  success: !!record,
  value: select ? record : data
});

// 纯函数：创建 ref 关键字配置
const createRefKeywordConfig = () => ({
  keyword: 'ref',
  type: ['string', 'integer'],
  schemaType: 'object',
  async: true,
  modifying: true,
  error: { message: 'not found' },
  async validate(schema, data, parentSchema, dataCtx) {
    try {
      logger.info('开始验证 ref 关键字', {
        schema,
        data,
        parentSchema: {
          type: parentSchema.type
        }
      });

      // 如果值为 null 且类型允许为 null，则跳过验证
      if (data === null && 
          (Array.isArray(parentSchema.type) && parentSchema.type.includes('null'))) {
        logger.info('跳过 null 值的验证');
        return true;
      }

      const { model, select, where = {} } = schema;
      const db = this.db;
      
      logger.info('数据库实例状态', {
        hasDb: !!db,
        model,
        select,
        where
      });
      
      validateDependencies(model, db);
      
      // 构建查询条件
      const queryOptions = createQueryOptions({
        where: { id: data, ...where }
      }, select);

      logger.info('执行数据库查询', {
        queryOptions
      });

      const record = await db[model].findUnique(queryOptions);

      logger.info('数据库查询结果', {
        record
      });

      if (!record) {
        logger.warn('未找到记录', {
          model,
          data
        });
        return false;
      }

      // 如果有 select，用查询结果替换原始值
      if (select) {
        dataCtx.parentData[dataCtx.parentDataProperty] = record;
        logger.info('替换原始值', {
          property: dataCtx.parentDataProperty,
          value: record
        });
      }
      
      return true;
    } catch (error) {
      logger.error('验证失败', { error, schema, data });
      return false;
    }
  }
});

// 纯函数：创建 Ajv 配置
const createAjvConfig = () => ({
  allErrors: true,
  removeAdditional: 'all',
  useDefaults: true,
  coerceTypes: true,
  messages: true,
  strict: true,
  passContext: true
});

// 纯函数：设置 Ajv 插件
const setupAjvPlugins = (ajv) => {
  addFormats(ajv);
  ajvErrors(ajv);
  ajvKeywords(ajv);
  
  // 添加手机号格式验证
  ajv.addFormat('phone', {
    type: 'string',
    validate: (phone) => {
      // 中国大陆手机号格式：1开头的11位数字
      const phoneRegex = /^1[3-9]\d{9}$/;
      return phoneRegex.test(phone);
    }
  });

  // 添加身份证号码格式验证
  ajv.addFormat('idcard', {
    type: 'string',
    validate: (idcard) => {
      // 身份证号码格式：18位，最后一位可以是数字或X/x
      const idcardRegex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
      return idcardRegex.test(idcard);
    }
  });
  
  return ajv;
};

// 纯函数：创建验证结果
const createValidationResult = (isValid, data = null, errors = null) => ({
  valid: isValid,
  ...(isValid ? { data } : { errors })
});

// 柯里化：创建验证函数
const createValidationFunction = (validateFn) => async (data, db) => {
  try {
    logger.info('开始执行验证函数', {
      hasDb: !!db,
      data
    });

    const dataCopy = JSON.parse(JSON.stringify(data));
    logger.info('数据拷贝完成', {
      dataCopy
    });

    const result = await validateFn.call({ db }, dataCopy);
    logger.info('验证函数执行完成', {
      result
    });

    return createValidationResult(true, result);
  } catch (error) {
    logger.error('验证函数执行失败', {
      error: {
        name: error.name,
        message: error.message,
        validation: !!error.validation,
        ajv: !!error.ajv,
        errors: error.errors
      }
    });

    if (error.validation) {
      return createValidationResult(false, null, error.errors);
    }
    if (error.ajv) {  // 处理 Ajv 的验证错误
      return createValidationResult(false, null, error.errors);
    }
    throw error;
  }
};

// 纯函数：创建编译选项
const createCompileOptions = (schema) => ({
  ...schema,
  $async: true
});

/**
 * 创建验证器实例
 * @param {Object} config 配置项
 * @param {boolean} [config.enableRef=false] 是否启用 ref 关键字
 * @returns {Object} 验证器实例
 */
export const createValidator = (config = {}) => {
  const { enableRef = false } = config;
  
  const ajv = setupAjvPlugins(new Ajv(createAjvConfig()));
  
  if (enableRef) {
    ajv.addKeyword(createRefKeywordConfig());
  }

  const validateSchema = async (schema, data, db) => {
    const validateFn = ajv.compile(createCompileOptions(schema));
    return createValidationFunction(validateFn)(data, db);
  };

  return {
    validate: validateSchema,
    compile: (schema) => {
      const validateFn = ajv.compile(createCompileOptions(schema));
      return createValidationFunction(validateFn);
    }
  };
};

export const localize = ajvLocalize; 