export default {
  path: '/users/:id',
  method: 'GET',
  handler: async (ctx) => {
    const { db } = ctx.state;
    if (!db) {
      ctx.throw(500, 'Database service not initialized');
    }

    const { id } = ctx.params;
    const user = await db.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      ctx.throw(404, 'User not found');
    }

    ctx.success(user);
  }
};
