/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     description: Returns a welcome message with timestamp and environment information
 *     tags:
 *       - Hello
 *     responses:
 *       200:
 *         description: Welcome message returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Operation successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Hello World! Welcome to your new Koa API.
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-12-25T01:03:58+08:00
 *                     env:
 *                       type: string
 *                       example: development
 */
export default {
  path: '/',
  method: 'GET',
  handler: async (ctx) => {
    ctx.success({
      message: 'Hello World! Welcome to your new Koa API.',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  }
};
