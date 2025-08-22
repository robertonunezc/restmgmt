import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// We'll test the error handling through the API endpoints since the middleware is CommonJS
describe('Error Handler Integration Tests', () => {
  let app;

  // Dynamically import the app
  beforeAll(async () => {
    const serverModule = await import('../server.js');
    app = serverModule.app;
  });

  describe('JSON Error Handling', () => {
    it('should handle malformed JSON with 400 status', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}'); // Malformed JSON

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid JSON format');
      expect(response.body.details).toBe('Request body contains malformed JSON');
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle validation errors in recipe creation', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .send({}); // Empty body should trigger validation

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should handle validation errors with specific field messages', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .send({
          name: '', // Invalid name
          category: 'invalid', // Invalid category
          ingredients: [] // Empty ingredients array
        });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      );
    });
  });

  describe('404 Error Handling', () => {
    it('should handle 404 for unmatched routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Route not found');
      expect(response.body.path).toBe('/api/nonexistent');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle recipe not found errors', async () => {
      const response = await request(app)
        .get('/api/recipes/99999'); // Non-existent recipe ID

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found');
    });

    it('should handle invalid recipe ID format', async () => {
      const response = await request(app)
        .get('/api/recipes/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid recipe ID. Must be a positive integer.');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .send({ name: 'Test', category: 'invalid' });

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(typeof response.body.error).toBe('string');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should return consistent error format for not found errors', async () => {
      const response = await request(app)
        .get('/api/recipes/99999');

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error).toBe('Recipe not found');
    });
  });
});