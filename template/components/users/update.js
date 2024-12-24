import { userSchema } from './schema.js';

export default {
  path: '/users/:id',
  method: 'PUT',
  handler: async (ctx) => {
    const { db } = ctx.state;
    if (!db) {
      ctx.throw(500, 'Database service not initialized');
    }

    const { id } = ctx.params;
    const { error, value } = userSchema.validate(ctx.request.body);
    if (error) {
      ctx.throw(400, error.details[0].message);
    }

    try {
      const user = await db.user.update({
        where: { id: parseInt(id) },
        data: value
      });

      ctx.success(user);
    } catch (err) {
      if (err.code === 'P2025') {
        ctx.throw(404, 'User not found');
      }
      if (err.code === 'P2002') {
        ctx.throw(409, 'Email already exists');
      }
      throw err;
    }
  }
};
