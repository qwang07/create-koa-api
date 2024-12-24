# Create Koa API

一个基于 Koa.js 的现代化 API 脚手架，提供完整的项目结构和最佳实践。

## 特性

- 🚀 现代化的 ES6+ 语法
- 📁 清晰的项目结构和路由组织
- 🛡️ 内置安全防护（CORS、Helmet、Rate Limit）
- 📝 自动生成 Swagger API 文档
- 🔍 详细的请求日志记录
- 🎯 统一的错误处理和响应格式
- ✅ 完整的测试支持

## 快速开始

### 安装

```bash
# 使用 npx 创建项目
npx create-koa-api my-api

# 进入项目目录
cd my-api

# 安装依赖
pnpm install
```

### 开发

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm start

# 运行测试
pnpm test
```

### 环境变量

创建 `.env` 文件：

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
ENABLE_FILE_LOGGING=false
LOG_DIR=logs
```

## 项目结构

```
.
├── bin/                # 启动脚本
│   ├── cli.js         # CLI 工具
│   └── www.js         # 服务器启动文件
├── components/         # 业务组件
│   └── users/         # 用户模块
│       ├── create.js  # 创建用户
│       ├── delete.js  # 删除用户
│       ├── get.js     # 获取用户
│       ├── list.js    # 用户列表
│       ├── update.js  # 更新用户
│       ├── schema.js  # 验证规则
│       └── data.js    # 数据存储
├── lib/               # 工具库
│   └── logger.js      # 日志工具
├── middlewares/       # 中间件
│   ├── bodyParser.js  # 请求体解析
│   ├── cors.js        # CORS 配置
│   ├── helmet.js      # 安全头配置
│   ├── responseHandler.js  # 响应处理
│   ├── router.js      # 路由加载器
│   ├── security.js    # 安全中间件
│   ├── swagger.js     # API 文档
│   └── validator.js   # 请求验证
├── test/              # 测试文件
│   └── users.test.js  # 用户模块测试
├── .env               # 环境变量
├── .gitignore
├── app.js            # 应用入口
├── package.json
└── README.md
```

## API 示例

### 用户模块

```javascript
// 获取用户列表
GET /users

// 获取单个用户
GET /users/:id

// 创建用户
POST /users
{
  "name": "John Doe",
  "email": "john@example.com"
}

// 更新用户
PUT /users/:id
{
  "name": "John Doe",
  "email": "john@example.com"
}

// 删除用户
DELETE /users/:id
```

## 中间件顺序

1. responseHandler - 响应处理（包含错误处理和日志）
2. helmet - 安全头
3. cors - 跨域支持
4. bodyParser - 请求体解析
5. rateLimiter - 限流保护
6. routes - 业务路由

## 最佳实践

1. 路由组织
   - 每个路由文件只处理一个端点
   - 使用 schema.js 集中管理验证规则
   - 使用 data.js 管理模块数据

2. 错误处理
   - 使用 ctx.throw() 抛出错误
   - 错误会被自动捕获并格式化
   - 生产环境不暴露错误堆栈

3. 日志记录
   - 自动记录请求和响应
   - 支持控制台和文件日志
   - 可配置的日志级别

4. 安全性
   - 默认启用安全头
   - 配置合理的 CORS 规则
   - 内置限流保护

## License

MIT
