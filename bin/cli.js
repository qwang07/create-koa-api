#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATE_DIR = join(__dirname, '../template');
const IGNORE_FILES = [
  '.git',
  'node_modules',
  'test-project',
  'pnpm-lock.yaml',
  'cli.js',
  'scaffold.config.json',
  'README.md'
];

// 复制目录
function copyDir(src, dest, services = {}) {
  const files = readdirSync(src, { withFileTypes: true });
  
  for (const file of files) {
    if (IGNORE_FILES.includes(file.name)) continue;
    
    const srcPath = join(src, file.name);
    const destPath = join(dest, file.name);
    
    // 特殊处理 components 目录
    if (file.name === 'components') {
      mkdirSync(destPath, { recursive: true });
      // 只复制 hello 组件（基础组件）
      const helloSrc = join(srcPath, 'hello');
      const helloDest = join(destPath, 'hello');
      mkdirSync(helloDest, { recursive: true });
      copyDir(helloSrc, helloDest);
      
      // 根据服务配置复制其他组件
      if (services.database) {
        const usersSrc = join(srcPath, 'users');
        const usersDest = join(destPath, 'users');
        mkdirSync(usersDest, { recursive: true });
        copyDir(usersSrc, usersDest);
      }
      continue;
    }
    
    if (file.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath, services);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// 生成 package.json 内容
function generatePackageJson(projectName, projectInfo, services) {
  // 根据是否启用测试来添加测试脚本
  const testScripts = services.testing ? {
    "test": "NODE_ENV=test mocha test/**/*.test.js --exit",
    "test:watch": "NODE_ENV=test mocha test/**/*.test.js --watch",
    "test:coverage": "NODE_ENV=test c8 mocha test/**/*.test.js --exit"
  } : {};

  return {
    name: projectName,
    version: projectInfo.version,
    description: projectInfo.description,
    type: 'module',
    private: true,  // 防止意外发布
    main: 'app.js',
    scripts: {
      "start": "node -r dotenv/config bin/www.js",
      "dev": "nodemon -r dotenv/config bin/www.js",
      ...testScripts,
      ...(services.database ? {
        "prisma:generate": "prisma generate",
        "prisma:migrate": "prisma migrate deploy",
        "prisma:studio": "prisma studio",
        "prisma:seed": "node prisma/seed.js",
        "db:setup": "npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed"
      } : {})
    },
    keywords: [
      "koa",
      "api",
      "backend",
      "nodejs",
      "rest"
    ],
    author: projectInfo.author,
    license: projectInfo.license === 'None' ? 'UNLICENSED' : projectInfo.license,
    dependencies: {
      "@koa/cors": "^5.0.0",
      "dotenv": "^16.4.7",
      "joi": "^17.11.0",
      "koa": "^2.15.3",
      "koa-body": "^6.0.1",
      "koa-compress": "^5.1.1",
      "koa-helmet": "^8.0.1",
      "koa-router": "^13.0.1",
      "koa-ratelimit": "^5.1.0",
      "winston": "^3.17.0",
      "swagger-jsdoc": "^6.2.8",
      "koa2-swagger-ui": "^5.10.0",
      ...(services.database ? {
        "@prisma/client": "^6.1.0"
      } : {}),
      ...(services.cache ? {
        "ioredis": "^5.3.2"
      } : {}),
      ...(services.fileService ? {
        "minio": "^8.0.3"
      } : {})
    },
    devDependencies: {
      "nodemon": "^3.1.9",
      ...(services.database ? {
        "prisma": "^6.1.0"
      } : {}),
      ...(services.testing ? {
        "chai": "^4.3.7",
        "mocha": "^10.2.0",
        "supertest": "^6.3.3",
        "c8": "^8.0.1"
      } : {})
    }
  };
}

// 初始化 Prisma
function initializePrisma(projectPath, databaseType) {
  const prismaDir = join(projectPath, 'prisma');
  mkdirSync(prismaDir, { recursive: true });
  
  // 创建 schema.prisma
  let schemaContent = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${databaseType.toLowerCase()}"
  url      = env("DATABASE_URL")
}

// 示例用户模型
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}`.trim();

  if (databaseType === 'SQLite') {
    schemaContent = schemaContent.replace('url      = env("DATABASE_URL")', 'url      = "./dev.db"');
  }

  writeFileSync(join(prismaDir, 'schema.prisma'), schemaContent);
}

// 生成数据库连接字符串
function generateDatabaseUrl(answers) {
  const { databaseType, databaseHost, databasePort, databaseName, databaseUser, databasePassword } = answers;
  
  switch (databaseType) {
    case 'PostgreSQL':
      return `postgresql://${databaseUser}:${databasePassword}@${databaseHost}:${databasePort}/${databaseName}?schema=public`;
    case 'MySQL':
      return `mysql://${databaseUser}:${databasePassword}@${databaseHost}:${databasePort}/${databaseName}`;
    case 'SQLite':
      return `sqlite:./${databaseName}.db`;
    default:
      return '';
  }
}

// Set up commander
program
  .name('create-koa-api')
  .description('CLI tool to create a new Koa2 API project')
  .version('1.0.0')
  .argument('<project-name>', 'Name of the project')
  .action(async (projectName) => {
    try {
      // 检查项目名称是否合法
      if (!/^[a-zA-Z0-9-]+$/.test(projectName)) {
        console.error('Project name can only contain letters, numbers and hyphens');
        process.exit(1);
      }

      // 检查目录是否已存在
      const projectPath = join(process.cwd(), projectName);
      if (existsSync(projectPath)) {
        console.error('Directory already exists');
        process.exit(1);
      }

      // 询问服务配置
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: projectName,
          validate: (input) => {
            if (/^[a-zA-Z0-9-_]+$/.test(input)) return true;
            return 'Project name can only contain letters, numbers, underscores and hyphens';
          }
        },
        {
          type: 'input',
          name: 'description',
          message: 'Project description:',
          default: 'A modern Node.js backend API based on Koa2'
        },
        {
          type: 'input',
          name: 'author',
          message: 'Author:',
          default: ''
        },
        {
          type: 'list',
          name: 'license',
          message: 'License:',
          choices: ['MIT', 'ISC', 'Apache-2.0', 'GPL-3.0', 'None'],
          default: 'MIT'
        },
        {
          type: 'input',
          name: 'version',
          message: 'Version:',
          default: '1.0.0',
          validate: (input) => {
            if (/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(input)) return true;
            return 'Version number format is incorrect (e.g., 1.0.0, 1.0.0-beta.1)';
          }
        },
        {
          type: 'confirm',
          name: 'enableDatabase',
          message: 'Enable database support (using Prisma)?',
          default: false,
        },
        {
          type: 'list',
          name: 'databaseType',
          message: 'Select database type:',
          choices: ['PostgreSQL', 'MySQL', 'SQLite'],
          when: (answers) => answers.enableDatabase,
        },
        {
          type: 'input',
          name: 'databaseHost',
          message: 'Database host:',
          default: 'localhost',
          when: (answers) => answers.enableDatabase && answers.databaseType !== 'SQLite',
        },
        {
          type: 'input',
          name: 'databasePort',
          message: 'Database port:',
          default: (answers) => {
            switch (answers.databaseType) {
              case 'PostgreSQL':
                return '5432';
              case 'MySQL':
                return '3306';
              default:
                return '';
            }
          },
          when: (answers) => answers.enableDatabase && answers.databaseType !== 'SQLite',
        },
        {
          type: 'input',
          name: 'databaseName',
          message: 'Database name:',
          default: (answers) => answers.projectName?.replace(/-/g, '_') || 'my_database',
          when: (answers) => answers.enableDatabase,
        },
        {
          type: 'input',
          name: 'databaseUser',
          message: 'Database user:',
          default: 'postgres',
          when: (answers) => answers.enableDatabase && answers.databaseType !== 'SQLite',
        },
        {
          type: 'password',
          name: 'databasePassword',
          message: 'Database password:',
          when: (answers) => answers.enableDatabase && answers.databaseType !== 'SQLite',
        },
        {
          type: 'confirm',
          name: 'enableCache',
          message: 'Enable cache support (using Redis)?',
          default: false,
        },
        {
          type: 'input',
          name: 'redisHost',
          message: 'Redis host:',
          default: 'localhost',
          when: (answers) => answers.enableCache,
        },
        {
          type: 'input',
          name: 'redisPort',
          message: 'Redis port:',
          default: '6379',
          when: (answers) => answers.enableCache,
        },
        {
          type: 'password',
          name: 'redisPassword',
          message: 'Redis password (if any):',
          when: (answers) => answers.enableCache,
        },
        {
          type: 'confirm',
          name: 'enableFileService',
          message: 'Enable file service support (using MinIO)?',
          default: false,
        },
        {
          type: 'input',
          name: 'minioEndpoint',
          message: 'MinIO endpoint:',
          default: 'localhost',
          when: (answers) => answers.enableFileService,
        },
        {
          type: 'input',
          name: 'minioPort',
          message: 'MinIO port:',
          default: '9000',
          when: (answers) => answers.enableFileService,
        },
        {
          type: 'confirm',
          name: 'minioUseSSL',
          message: 'Use SSL for MinIO connection?',
          default: false,
          when: (answers) => answers.enableFileService,
        },
        {
          type: 'input',
          name: 'minioAccessKey',
          message: 'MinIO Access Key:',
          when: (answers) => answers.enableFileService,
        },
        {
          type: 'password',
          name: 'minioSecretKey',
          message: 'MinIO Secret Key:',
          when: (answers) => answers.enableFileService,
        },
        {
          type: 'input',
          name: 'minioBucket',
          message: 'MinIO default bucket name:',
          default: (answers) => answers.projectName?.replace(/-/g, '_') || 'default',
          when: (answers) => answers.enableFileService,
        },
        {
          type: 'confirm',
          name: 'enableTesting',
          message: 'Add testing support (Mocha + Chai)?',
          default: true
        }
      ]);

      // 创建项目目录
      mkdirSync(projectPath, { recursive: true });

      // 复制模板文件
      console.log('Creating project files...');
      const templatePath = join(dirname(fileURLToPath(import.meta.url)), '../template');

      // 复制基础文件
      copyDir(templatePath, projectPath, {
        database: answers.enableDatabase,
        cache: answers.enableCache,
        fileService: answers.enableFileService,
      });

      // 生成 package.json
      console.log('Generating package.json...');
      const packageJson = generatePackageJson(projectName, {
        version: answers.version,
        description: answers.description,
        author: answers.author,
        license: answers.license
      }, {
        database: answers.enableDatabase,
        cache: answers.enableCache,
        fileService: answers.enableFileService,
        testing: answers.enableTesting
      });

      // 写入 package.json
      writeFileSync(
        join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // 生成环境变量文件
      console.log('Generating .env file...');
      const envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
ENABLE_DATABASE=${answers.enableDatabase}
${answers.enableDatabase ? `DATABASE_URL="${generateDatabaseUrl(answers)}"` : '# DATABASE_URL="your-database-url"'}

# Redis Configuration
ENABLE_CACHE=${answers.enableCache}
${answers.enableCache ? `
REDIS_HOST="${answers.redisHost}"
REDIS_PORT=${answers.redisPort}
REDIS_PASSWORD="${answers.redisPassword}"` : `
# REDIS_HOST="localhost"
# REDIS_PORT=6379
# REDIS_PASSWORD=""`}

# MinIO Configuration
ENABLE_FILE_SERVICE=${answers.enableFileService}
${answers.enableFileService ? `
MINIO_ENDPOINT="${answers.minioEndpoint}"
MINIO_PORT=${answers.minioPort}
MINIO_ACCESS_KEY="${answers.minioAccessKey}"
MINIO_SECRET_KEY="${answers.minioSecretKey}"
MINIO_USE_SSL=${answers.minioUseSSL}
MINIO_BUCKET="${answers.minioBucket}"` : `
# MINIO_ENDPOINT="play.min.io"
# MINIO_PORT=9000
# MINIO_ACCESS_KEY="your-access-key"
# MINIO_SECRET_KEY="your-secret-key"
# MINIO_USE_SSL=true
# MINIO_BUCKET="your-bucket"`}
`;

      writeFileSync(join(projectPath, '.env'), envContent);

      // 安装依赖
      console.log('Installing dependencies...');
      process.chdir(projectPath);
      execSync('pnpm install', { stdio: 'inherit' });

      // 如果启用了数据库，初始化 Prisma
      if (answers.enableDatabase) {
        console.log('Initializing Prisma...');
        // 替换数据库提供商
        const schemaPath = join(projectPath, 'prisma/schema.prisma');
        let schemaContent = readFileSync(schemaPath, 'utf8');
        schemaContent = schemaContent.replace(
          'provider = "postgresql"',
          `provider = "${answers.databaseType.toLowerCase()}"`
        );
        writeFileSync(schemaPath, schemaContent);

        // 生成 Prisma Client
        console.log('Generating Prisma Client...');
        execSync('pnpm prisma generate', { stdio: 'inherit' });
      }

      // 如果启用 MinIO，尝试创建默认存储桶
      if (answers.enableFileService) {
        console.log('Initializing MinIO bucket...');
        const { Client } = await import('minio');
        const minioClient = new Client({
          endPoint: answers.minioEndpoint,
          port: parseInt(answers.minioPort),
          useSSL: answers.minioUseSSL,
          accessKey: answers.minioAccessKey,
          secretKey: answers.minioSecretKey
        });

        try {
          const bucketExists = await minioClient.bucketExists(answers.minioBucket);
          if (!bucketExists) {
            await minioClient.makeBucket(answers.minioBucket);
            console.log(`MinIO bucket ${answers.minioBucket} created successfully`);
          } else {
            console.log(`MinIO bucket ${answers.minioBucket} already exists`);
          }
        } catch (error) {
          console.warn('MinIO bucket creation failed, please ensure MinIO service is running and configured correctly');
        }
      }

      console.log('Project created successfully!');

      // 构建配置信息提示
      const configSteps = [];

      // 基础步骤
      configSteps.push(`Next steps:
1. cd ${projectName}
2. Modify .env file as needed`);

      // 数据库配置
      if (answers.enableDatabase) {
        configSteps.push(`Database configuration:
${answers.databaseType === 'SQLite' ? 
  'Database is already configured, no further setup is required.' : 
  `1. Ensure database service is running and accessible
2. Verify .env file for database connection information
3. Run pnpm prisma:migrate dev --name init to initialize database schema
4. Run pnpm prisma:studio to start Prisma Studio (optional)`}`);
      }

      // Redis配置
      if (answers.enableCache) {
        configSteps.push(`Redis configuration:
1. Ensure Redis service is running
2. Verify .env file for Redis connection information:
   REDIS_URL="${answers.redisHost}:${answers.redisPort}"`);
      }

      // MinIO配置
      if (answers.enableFileService) {
        configSteps.push(`MinIO configuration:
1. Ensure MinIO service is running
2. Verify .env file for MinIO connection information:
   MINIO_ENDPOINT="${answers.minioEndpoint}"
   MINIO_PORT="${answers.minioPort}"
   MINIO_ACCESS_KEY="${answers.minioAccessKey}"
   MINIO_SECRET_KEY="${answers.minioSecretKey}"`);
      }

      // 测试配置
      if (answers.enableTesting) {
        configSteps.push(`Testing configuration:
1. Run pnpm test to execute tests
2. Run pnpm test:watch to watch for test file changes
3. Run pnpm test:coverage to generate test coverage report`);
      }

      // 启动说明
      configSteps.push(`To start the server:
pnpm dev

Your API will be available at:
- HTTP server: http://localhost:3000
- API documentation: http://localhost:3000/docs`);

      // 输出所有配置信息，用空行分隔
      console.log(configSteps.join('\n\n'));

    } catch (error) {
      console.error('Project creation failed:', error);
      process.exit(1);
    }
  });

program.parse();
