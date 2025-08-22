/**
 * Integration tests for recipe ingredient linking API endpoints
 * Tests Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
const { app } = require('../server');
import { DatabaseUtils } from '../utils/database.js';

describe('Recipe Ingredient Linking API', () => {
  let testProductId;
  let testRecipeId;
  let testRecipeIngredientId;
  let testLinkId;

  beforeAll(async () => {
    // Create test product
    const productResult = await DatabaseUtils.query(`
      INSERT INTO products (name, unit_of_measure, current_quantity)
      VALUES ('Test Product for API', 'kg', 15.0)
      RETURNING id
    `);
    testProductId = productResult.rows[0].id;

    // Create test recipe and ingredient
    const recipeResult = await DatabaseUtils.query(`
      INSERT INTO recipes (name, description, category, servings, prep_time, cook_time)
      VALUES ('Test Recipe for API', 'Test recipe for API testing', 'food', 4, 15, 25)
      RETURNING id
    `);
    testRecipeId = recipeResult.rows[0].id;

    const ingredientResult = await DatabaseUtils.query(`
      INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, order_index)
      VALUES ($1, 'Test Ingredient for API', 3.0, 'kg', 1)
      RETURNING id
    `, [testRecipeId]);
    testRecipeIngredientId = ingredientResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testLinkId) {
      await DatabaseUtils.query('DELETE FROM recipe_ingredient_products WHERE id = $1', [testLinkId]);
    }
    if (testRecipeIngredientId) {
      await DatabaseUtils.query('DELETE FROM recipe_ingredients WHERE id = $1', [testRecipeIngredientId]);
    }
    if (testProductId) {
      await DatabaseUtils.query('DELETE FROM products WHERE id = $1', [testProductId]);
    }
    // Clean up recipe (will cascade to ingredients)
    await DatabaseUtils.query('DELETE FROM recipes WHERE id = $1', [testRecipeId]);
  });

  beforeEach(async () => {
    // Clean up any existing test links
    await DatabaseUtils.query(`
      DELETE FROM recipe_ingredient_products 
      WHERE recipe_ingredient_id = $1 AND product_id = $2
    `, [testRecipeIngredientId, testProductId]);
  });

  describe('POST /api/inventory/recipe-links', () => {
    it('should create valid recipe ingredient link', async () => {
      const linkData = {
        recipe_ingredient_id: testRecipeIngredientId,
        product_id: testProductId,
        quantity_per_serving: 2.5
      };

      const response = await request(app)
        .post('/api/inventory/recipe-links')
        .send(linkData)
        .expect(201);

      expect(response.body.message).toBe('Recipe ingredient link created successfully');
      expect(response.body.link).toBeTruthy();
      expect(response.body.link.recipe_ingredient_id).toBe(testRecipeIngredientId);
      expect(response.body.link.product_id).toBe(testProductId);
      expect(parseFloat(response.body.link.quantity_per_serving)).toBe(2.5);
      expect(response.body.link.id).toBeTruthy();

      testLinkId = response.body.link.id; // Store for cleanup
    });

    it('should reject invalid link data', async () => {
      const linkData = {
        recipe_ingredient_id: -1,
        product_id: testProductId,
        quantity_per_serving: -2.5
      };

      const response = await request(app)
        .post('/api/inventory/recipe-links')
        .send(linkData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient ID must be a positive integer'
      });
      expect(response.body.details).toContainEqual({
        field: 'quantity_per_serving',
        message: 'Quantity per serving must be a positive number'
      });
    });

    it('should reject missing required fields', async () => {
      const linkData = {
        product_id: testProductId
        // Missing recipe_ingredient_id and quantity_per_serving
      };

      const response = await request(app)
        .post('/api/inventory/recipe-links')
        .send(linkData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient ID is required'
      });
      expect(response.body.details).toContainEqual({
        field: 'quantity_per_serving',
        message: 'Quantity per serving is required'
      });
    });

    it('should reject non-existing recipe ingredient', async () => {
      const linkData = {
        recipe_ingredient_id: 99999,
        product_id: testProductId,
        quantity_per_serving: 2.5
      };

      const response = await request(app)
        .post('/api/inventory/recipe-links')
        .send(linkData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient with ID 99999 does not exist'
      });
    });

    it('should reject non-existing product', async () => {
      const linkData = {
        recipe_ingredient_id: testRecipeIngredientId,
        product_id: 99999,
        quantity_per_serving: 2.5
      };

      const response = await request(app)
        .post('/api/inventory/recipe-links')
        .send(linkData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual({
        field: 'product_id',
        message: 'Product with ID 99999 does not exist'
      });
    });

    it('should reject duplicate link', async () => {
      const linkData = {
        recipe_ingredient_id: testRecipeIngredientId,
        product_id: testProductId,
        quantity_per_serving: 2.5
      };

      // Create first link
      const firstResponse = await request(app)
        .post('/api/inventory/recipe-links')
        .send(linkData)
        .expect(201);

      testLinkId = firstResponse.body.link.id;

      // Try to create duplicate link
      const secondResponse = await request(app)
        .post('/api/inventory/recipe-links')
        .send(linkData)
        .expect(400);

      expect(secondResponse.body.error).toBe('Validation failed');
      expect(secondResponse.body.details).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Link between this recipe ingredient and product already exists'
      });
    });
  });

  describe('GET /api/inventory/recipe-links/:recipeId', () => {
    it('should return empty array when no links exist', async () => {
      const response = await request(app)
        .get(`/api/inventory/recipe-links/${testRecipeId}`)
        .expect(200);

      expect(response.body.recipeId).toBe(testRecipeId);
      expect(response.body.links).toEqual([]);
    });

    it('should return links with ingredient and product info', async () => {
      // Create a test link first
      const linkResult = await DatabaseUtils.query(`
        INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testRecipeIngredientId, testProductId, 1.5]);
      testLinkId = linkResult.rows[0].id;

      const response = await request(app)
        .get(`/api/inventory/recipe-links/${testRecipeId}`)
        .expect(200);

      expect(response.body.recipeId).toBe(testRecipeId);
      expect(response.body.links).toHaveLength(1);
      
      const link = response.body.links[0];
      expect(link.recipe_ingredient_id).toBe(testRecipeIngredientId);
      expect(link.product_id).toBe(testProductId);
      expect(parseFloat(link.quantity_per_serving)).toBe(1.5);
      expect(link.ingredient_name).toBe('Test Ingredient for API');
      expect(link.product_name).toBe('Test Product for API');
      expect(link.unit_of_measure).toBe('kg');
      expect(parseFloat(link.current_quantity)).toBe(15.0);
    });

    it('should reject invalid recipe ID', async () => {
      const response = await request(app)
        .get('/api/inventory/recipe-links/invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid recipe ID. Must be a positive integer.');
    });

    it('should reject negative recipe ID', async () => {
      const response = await request(app)
        .get('/api/inventory/recipe-links/-1')
        .expect(400);

      expect(response.body.error).toBe('Invalid recipe ID. Must be a positive integer.');
    });

    it('should return empty array for non-existing recipe', async () => {
      const response = await request(app)
        .get('/api/inventory/recipe-links/99999')
        .expect(200);

      expect(response.body.recipeId).toBe(99999);
      expect(response.body.links).toEqual([]);
    });
  });

  describe('DELETE /api/inventory/recipe-links/:id', () => {
    it('should delete existing link', async () => {
      // Create a test link first
      const linkResult = await DatabaseUtils.query(`
        INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testRecipeIngredientId, testProductId, 2.0]);
      const linkId = linkResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/inventory/recipe-links/${linkId}`)
        .expect(200);

      expect(response.body.message).toBe('Recipe ingredient link deleted successfully');

      // Verify link was deleted
      const checkResult = await DatabaseUtils.query(`
        SELECT id FROM recipe_ingredient_products WHERE id = $1
      `, [linkId]);
      expect(checkResult.rows).toHaveLength(0);
    });

    it('should return 404 for non-existing link', async () => {
      const response = await request(app)
        .delete('/api/inventory/recipe-links/99999')
        .expect(404);

      expect(response.body.error).toBe('Recipe ingredient link not found');
    });

    it('should reject invalid link ID', async () => {
      const response = await request(app)
        .delete('/api/inventory/recipe-links/invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid link ID. Must be a positive integer.');
    });

    it('should reject negative link ID', async () => {
      const response = await request(app)
        .delete('/api/inventory/recipe-links/-1')
        .expect(400);

      expect(response.body.error).toBe('Invalid link ID. Must be a positive integer.');
    });
  });
});