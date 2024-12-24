export default {
  path: '/users/:id',
  method: 'DELETE',
  handler: async (ctx) => {
    const { db } = ctx.state;
    if (!db) {
      ctx.throw(500, 'Database service not initialized');
    }

    const { id } = ctx.params;
    
    try {
      await db.user.delete({
        where: { id: parseInt(id) }
      });

      ctx.status = 204;
    } catch (err) {
      if (err.code === 'P2025') {
        ctx.throw(404, 'User not found');
      }
      throw err;
    }
  }
};
