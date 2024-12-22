#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const logger = require('../lib/logger');

// Set up commander
program
  .name('create-koa-api')
  .description('CLI tool to create a new Koa2 API project')
  .version('1.0.0')
  .argument('<project-name>', 'Name of the project')
  .action(async (projectName) => {
    try {
      // Prompt for service configuration
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableDatabase',
          message: 'Would you like to enable database support (using Prisma)?',
          default: false,
        },
        {
          type: 'confirm',
          name: 'enableCache',
          message: 'Would you like to enable cache support (using Redis)?',
          default: false,
        },
        {
          type: 'confirm',
          name: 'enableFileService',
          message: 'Would you like to enable file service support (using MinIO)?',
          default: false,
        }
      ]);

      // Create project directory
      const projectPath = path.join(process.cwd(), projectName);
      fs.mkdirSync(projectPath, { recursive: true });

      // Initialize package.json
      execSync('pnpm init -y', { cwd: projectPath });

      // Install base dependencies
      logger.info('Installing base dependencies...');
      execSync('pnpm add koa koa-router koa-bodyparser @koa/cors winston dotenv', { 
        cwd: projectPath,
        stdio: 'inherit'
      });

      // Install optional dependencies based on user choices
      if (answers.enableDatabase) {
        logger.info('Installing database dependencies...');
        execSync('pnpm add prisma @prisma/client', {
          cwd: projectPath,
          stdio: 'inherit'
        });
      }

      if (answers.enableCache) {
        logger.info('Installing cache dependencies...');
        execSync('pnpm add redis', {
          cwd: projectPath,
          stdio: 'inherit'
        });
      }

      if (answers.enableFileService) {
        logger.info('Installing file service dependencies...');
        execSync('pnpm add minio', {
          cwd: projectPath,
          stdio: 'inherit'
        });
      }

      // Create .env file with service configuration
      const envContent = `
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=${answers.enableDatabase ? 'postgresql://user:password@localhost:5432/dbname' : ''}

# Redis Configuration
REDIS_URL=${answers.enableCache ? 'redis://localhost:6379' : ''}

# MinIO Configuration
MINIO_ENDPOINT=${answers.enableFileService ? 'localhost' : ''}
MINIO_PORT=${answers.enableFileService ? '9000' : ''}
MINIO_ACCESS_KEY=${answers.enableFileService ? 'your-access-key' : ''}
MINIO_SECRET_KEY=${answers.enableFileService ? 'your-secret-key' : ''}
MINIO_BUCKET=${answers.enableFileService ? 'your-bucket-name' : ''}
`.trim();

      fs.writeFileSync(path.join(projectPath, '.env'), envContent);

      // Save configuration for later use
      const config = {
        services: {
          database: answers.enableDatabase,
          cache: answers.enableCache,
          fileService: answers.enableFileService
        }
      };

      fs.writeFileSync(
        path.join(projectPath, 'scaffold.config.json'),
        JSON.stringify(config, null, 2)
      );

      logger.info('Project created successfully!');
      logger.info(`
Next steps:
1. cd ${projectName}
2. Update .env with your configuration
3. pnpm install
4. pnpm start
      `);

    } catch (error) {
      logger.error('Error creating project:', error);
      process.exit(1);
    }
  });

program.parse();
