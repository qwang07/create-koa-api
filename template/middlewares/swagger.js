import swaggerJsdoc from 'swagger-jsdoc';
import { koaSwagger } from 'koa2-swagger-ui';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Koa API',
      version: '1.0.0',
      description: 'A RESTful API built with Koa.js',
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: 'HTTP status code',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: [join(__dirname, '../components/**/*.js')],
};

const spec = swaggerJsdoc(options);

export const swaggerUI = koaSwagger({
  routePrefix: '/docs',
  swaggerOptions: {
    spec,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    docExpansion: 'list',
    defaultModelExpandDepth: 3,
    defaultModelsExpandDepth: 3,
    defaultModelRendering: 'model',
    displayRequestDuration: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    filter: true,
    persistAuthorization: true,
  },
  exposeSpec: true,
  hideTopbar: false,
});

// Add route to serve swagger specs
export const serveSwaggerSpecs = async (ctx, next) => {
  if (ctx.path === '/docs/swagger-en.json') {
    ctx.body = spec;
  } else {
    await next();
  }
};
