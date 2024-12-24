import rateLimit from 'koa-ratelimit';

// 内存存储限流
const db = new Map();

// 基本限流配置
export const rateLimiter = rateLimit({
  driver: 'memory',
  db: db,
  duration: 60000, // 1 分钟
  max: 100,       // 最大请求数
  errorMessage: 'Too many requests, please try again later.',
  id: (ctx) => ctx.ip, // 使用 IP 作为标识
});

// 更严格的 API 限流
export const strictRateLimiter = rateLimit({
  driver: 'memory',
  db: db,
  duration: 60000,
  max: 30,
  errorMessage: 'Too many API requests, please try again later.',
  id: (ctx) => ctx.ip,
});
