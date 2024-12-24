import request from 'supertest';
import { expect } from 'chai';
import app from '../app.js';

describe('User API', () => {
  let server;
  let createdUserId;

  before(() => {
    server = app.listen();
  });

  after(() => {
    server.close();
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const res = await request(server)
        .get('/users')
        .expect(200);

      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.at.least(2);
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const res = await request(server)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(res.body.data).to.include({
        name: userData.name,
        email: userData.email
      });
      expect(res.body.data.id).to.be.a('number');
      createdUserId = res.body.data.id;
    });

    it('should return 409 if email already exists', async () => {
      const userData = {
        name: 'Another User',
        email: 'test@example.com'
      };

      await request(server)
        .post('/users')
        .send(userData)
        .expect(409);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const res = await request(server)
        .get(`/users/${createdUserId}`)
        .expect(200);

      expect(res.body.data.id).to.equal(createdUserId);
    });

    it('should return 404 if user not found', async () => {
      await request(server)
        .get('/users/999999')
        .expect(404);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const res = await request(server)
        .put(`/users/${createdUserId}`)
        .send(updateData)
        .expect(200);

      expect(res.body.data).to.include(updateData);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user', async () => {
      await request(server)
        .delete(`/users/${createdUserId}`)
        .expect(200);

      // Verify user is deleted
      await request(server)
        .get(`/users/${createdUserId}`)
        .expect(404);
    });
  });
});
