import { userSchema } from './schema.js';

export default {
  path: '/users',
  method: 'POST',
  handler: async (ctx) => {
    const { db } = ctx.state;
    if (!db) {
      ctx.throw(500, 'Database service not initialized');
    }

    const { error, value } = userSchema.validate(ctx.request.body);
    if (error) {
      ctx.throw(400, error.details[0].message);
    }

    try {
      const user = await db.user.create({
        data: value
      });
      
      ctx.status = 201;
      ctx.success(user);
    } catch (err) {
      if (err.code === 'P2002') {
        ctx.throw(409, 'Email already exists');
      }
      throw err;
    }
  }
};
