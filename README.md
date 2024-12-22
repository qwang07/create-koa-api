# create-koa-api

A modern Node.js backend API scaffold based on Koa2, featuring dynamic routing, middleware support, logging system, and CLI tools for rapid development.

## Features

- 🚀 Quick project setup with CLI tools
- 📦 Dynamic route loading mechanism
- 🛡️ Built-in middleware support (CORS, BodyParser, Helmet, etc.)
- 📝 Advanced logging system with namespace support
- 🔌 Optional database, cache, and file storage support
- 🎯 Modular and extensible architecture

## Quick Start

```bash
npx create-koa-api my-project
cd my-project
npm install
npm start
```

Visit: http://localhost:3000/example

## Project Structure

```plaintext
my-project/
├── bin/
│   └── www.js               # Server startup script
├── components/              # Route components
│   └── example.js          # Example route
├── lib/                    # Shared libraries
│   ├── db.js              # Database wrapper
│   ├── cache.js           # Cache wrapper
│   ├── file.js            # File storage wrapper
│   └── logger.js          # Logging utility
├── middlewares/           # Middleware
│   ├── router.js          # Dynamic route loader
│   ├── errorHandler.js    # Error handling
│   ├── cors.js            # CORS configuration
│   └── bodyParser.js      # Request parsing
├── utils/                 # Utility functions
├── .env                   # Environment variables
├── app.js                # Main application
└── package.json          # Project configuration
```

## Configuration

Environment variables can be configured in the `.env` file:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Optional Services
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
REDIS_URL="redis://localhost:6379"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"
```

## Adding Routes

Create a new file in the `components` directory:

```javascript
// components/users.js
module.exports = (router) => {
  router.get('/users', async (ctx) => {
    ctx.body = { message: 'Users route' };
  });
};
```

Routes are automatically loaded on startup.

## Logging

The logging system supports namespaces based on file names:

```javascript
const logger = require('../lib/logger');

logger.info('Message'); // [filename:info]: Message
logger.error('Error'); // [filename:error]: Error
```

## Scripts

- `npm start`: Start the server
- `npm run dev`: Start with nodemon for development

## License

MIT
