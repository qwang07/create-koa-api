export default {
  path: '/users',
  method: 'GET',
  handler: async (ctx) => {
    const { db } = ctx.state;
    if (!db) {
      ctx.throw(500, 'Database service not initialized');
    }

    const users = await db.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    ctx.success(users);
  }
};
