/**
 * @swagger
 * /echo:
 *   post:
 *     summary: Echo endpoint
 *     description: Returns the request body with a timestamp
 *     tags:
 *       - Hello
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message to echo
 *                 example: Hello, API!
 *     responses:
 *       200:
 *         description: Message echoed successfully
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
 *                     originalMessage:
 *                       type: string
 *                       example: Hello, API!
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-12-25T01:03:58+08:00
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export default {
  path: '/echo',
  method: 'POST',
  handler: async (ctx) => {
    const { message } = ctx.request.body;
    
    if (!message) {
      ctx.error(400, 'Message is required');
      return;
    }

    ctx.success({
      originalMessage: message,
      timestamp: new Date().toISOString()
    });
  }
};
