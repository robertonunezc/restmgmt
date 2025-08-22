/**
 * Unit tests for recipe ingredient linking database operations
 * Tests Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseUtils } from '../utils/database.js';
import { RecipeIngredientProductQueries } from '../utils/inventory-database.js';

describe('Recipe Ingredient Linking Database Operations', () => {
  let testProductId;
  let testRecipeIngredientId;
  let testLinkId;

  beforeAll(async () => {
    // Create test product
    const productResult = await DatabaseUtils.query(`
      INSERT INTO products (name, unit_of_measure, current_quantity)
      VALUES ('Test Product for Linking', 'kg', 10.0)
      RETURNING id
    `);
    testProductId = productResult.rows[0].id;

    // Create test recipe and ingredient
    const recipeResult = await DatabaseUtils.query(`
      INSERT INTO recipes (name, description, category, servings, prep_time, cook_time)
      VALUES ('Test Recipe for Linking', 'Test recipe', 'food', 4, 10, 20)
      RETURNING id
    `);
    const testRecipeId = recipeResult.rows[0].id;

    const ingredientResult = await DatabaseUtils.query(`
      INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, order_index)
      VALUES ($1, 'Test Ingredient', 2.0, 'kg', 1)
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
    await DatabaseUtils.query('DELETE FROM recipes WHERE name = $1', ['Test Recipe for Linking']);
  });

  describe('validateRecipeIngredientExists', () => {
    it('should return true for existing recipe ingredient', async () => {
      const exists = await RecipeIngredientProductQueries.validateRecipeIngredientExists(testRecipeIngredientId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing recipe ingredient', async () => {
      const exists = await RecipeIngredientProductQueries.validateRecipeIngredientExists(99999);
      expect(exists).toBe(false);
    });
  });

  describe('validateProductExists', () => {
    it('should return true for existing product', async () => {
      const exists = await RecipeIngredientProductQueries.validateProductExists(testProductId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing product', async () => {
      const exists = await RecipeIngredientProductQueries.validateProductExists(99999);
      expect(exists).toBe(false);
    });
  });

  describe('validateRecipeIngredientAndProduct', () => {
    it('should validate existing recipe ingredient and product', async () => {
      const result = await RecipeIngredientProductQueries.validateRecipeIngredientAndProduct(
        testRecipeIngredientId, 
        testProductId
      );
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-existing recipe ingredient', async () => {
      const result = await RecipeIngredientProductQueries.validateRecipeIngredientAndProduct(
        99999, 
        testProductId
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient with ID 99999 does not exist'
      });
    });

    it('should return error for non-existing product', async () => {
      const result = await RecipeIngredientProductQueries.validateRecipeIngredientAndProduct(
        testRecipeIngredientId, 
        99999
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product with ID 99999 does not exist'
      });
    });

    it('should return errors for both non-existing recipe ingredient and product', async () => {
      const result = await RecipeIngredientProductQueries.validateRecipeIngredientAndProduct(
        99998, 
        99999
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient with ID 99998 does not exist'
      });
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product with ID 99999 does not exist'
      });
    });
  });

  describe('linkExists', () => {
    beforeEach(async () => {
      // Clean up any existing test links
      await DatabaseUtils.query(`
        DELETE FROM recipe_ingredient_products 
        WHERE recipe_ingredient_id = $1 AND product_id = $2
      `, [testRecipeIngredientId, testProductId]);
    });

    it('should return false when link does not exist', async () => {
      const exists = await RecipeIngredientProductQueries.linkExists(
        testRecipeIngredientId, 
        testProductId
      );
      expect(exists).toBe(false);
    });

    it('should return true when link exists', async () => {
      // Create a test link
      await DatabaseUtils.query(`
        INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
        VALUES ($1, $2, $3)
      `, [testRecipeIngredientId, testProductId, 2.5]);

      const exists = await RecipeIngredientProductQueries.linkExists(
        testRecipeIngredientId, 
        testProductId
      );
      expect(exists).toBe(true);

      // Clean up
      await DatabaseUtils.query(`
        DELETE FROM recipe_ingredient_products 
        WHERE recipe_ingredient_id = $1 AND product_id = $2
      `, [testRecipeIngredientId, testProductId]);
    });
  });

  describe('createLinkWithValidation', () => {
    beforeEach(async () => {
      // Clean up any existing test links
      await DatabaseUtils.query(`
        DELETE FROM recipe_ingredient_products 
        WHERE recipe_ingredient_id = $1 AND product_id = $2
      `, [testRecipeIngredientId, testProductId]);
    });

    it('should create valid link successfully', async () => {
      const linkData = {
        recipe_ingredient_id: testRecipeIngredientId,
        product_id: testProductId,
        quantity_per_serving: 2.5
      };

      const result = await RecipeIngredientProductQueries.createLinkWithValidation(linkData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.data.recipe_ingredient_id).toBe(testRecipeIngredientId);
      expect(result.data.product_id).toBe(testProductId);
      expect(parseFloat(result.data.quantity_per_serving)).toBe(2.5);

      testLinkId = result.data.id; // Store for cleanup
    });

    it('should reject invalid link data', async () => {
      const linkData = {
        recipe_ingredient_id: -1,
        product_id: testProductId,
        quantity_per_serving: -2.5
      };

      const result = await RecipeIngredientProductQueries.createLinkWithValidation(linkData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient ID must be a positive integer'
      });
      expect(result.errors).toContainEqual({
        field: 'quantity_per_serving',
        message: 'Quantity per serving must be a positive number'
      });
    });

    it('should reject non-existing recipe ingredient', async () => {
      const linkData = {
        recipe_ingredient_id: 99999,
        product_id: testProductId,
        quantity_per_serving: 2.5
      };

      const result = await RecipeIngredientProductQueries.createLinkWithValidation(linkData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
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

      const result = await RecipeIngredientProductQueries.createLinkWithValidation(linkData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
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
      const firstResult = await RecipeIngredientProductQueries.createLinkWithValidation(linkData);
      expect(firstResult.success).toBe(true);
      testLinkId = firstResult.data.id;

      // Try to create duplicate link
      const secondResult = await RecipeIngredientProductQueries.createLinkWithValidation(linkData);
      
      expect(secondResult.success).toBe(false);
      expect(secondResult.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Link between this recipe ingredient and product already exists'
      });
    });
  });

  describe('createLink (basic operation)', () => {
    beforeEach(async () => {
      // Clean up any existing test links
      await DatabaseUtils.query(`
        DELETE FROM recipe_ingredient_products 
        WHERE recipe_ingredient_id = $1 AND product_id = $2
      `, [testRecipeIngredientId, testProductId]);
    });

    it('should create link with valid data', async () => {
      const linkData = {
        recipe_ingredient_id: testRecipeIngredientId,
        product_id: testProductId,
        quantity_per_serving: 3.0
      };

      const result = await RecipeIngredientProductQueries.createLink(linkData);
      
      expect(result).toBeTruthy();
      expect(result.recipe_ingredient_id).toBe(testRecipeIngredientId);
      expect(result.product_id).toBe(testProductId);
      expect(parseFloat(result.quantity_per_serving)).toBe(3.0);
      expect(result.id).toBeTruthy();
      expect(result.created_at).toBeTruthy();

      testLinkId = result.id; // Store for cleanup
    });
  });

  describe('getRecipeProductLinks', () => {
    let testRecipeId;

    beforeAll(async () => {
      // Get the recipe ID for our test ingredient
      const recipeResult = await DatabaseUtils.query(`
        SELECT recipe_id FROM recipe_ingredients WHERE id = $1
      `, [testRecipeIngredientId]);
      testRecipeId = recipeResult.rows[0].recipe_id;
    });

    beforeEach(async () => {
      // Clean up any existing test links
      await DatabaseUtils.query(`
        DELETE FROM recipe_ingredient_products 
        WHERE recipe_ingredient_id = $1
      `, [testRecipeIngredientId]);
    });

    it('should return empty array when no links exist', async () => {
      const links = await RecipeIngredientProductQueries.getRecipeProductLinks(testRecipeId);
      expect(links).toEqual([]);
    });

    it('should return links with ingredient and product info', async () => {
      // Create a test link
      const linkResult = await DatabaseUtils.query(`
        INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testRecipeIngredientId, testProductId, 1.5]);
      testLinkId = linkResult.rows[0].id;

      const links = await RecipeIngredientProductQueries.getRecipeProductLinks(testRecipeId);
      
      expect(links).toHaveLength(1);
      const link = links[0];
      
      expect(link.recipe_ingredient_id).toBe(testRecipeIngredientId);
      expect(link.product_id).toBe(testProductId);
      expect(parseFloat(link.quantity_per_serving)).toBe(1.5);
      expect(link.ingredient_name).toBe('Test Ingredient');
      expect(link.product_name).toBe('Test Product for Linking');
      expect(link.unit_of_measure).toBe('kg');
      expect(parseFloat(link.current_quantity)).toBe(10.0);
    });
  });

  describe('deleteLink', () => {
    beforeEach(async () => {
      // Clean up any existing test links
      await DatabaseUtils.query(`
        DELETE FROM recipe_ingredient_products 
        WHERE recipe_ingredient_id = $1 AND product_id = $2
      `, [testRecipeIngredientId, testProductId]);
    });

    it('should return false when trying to delete non-existing link', async () => {
      const result = await RecipeIngredientProductQueries.deleteLink(99999);
      expect(result).toBe(false);
    });

    it('should delete existing link and return true', async () => {
      // Create a test link
      const linkResult = await DatabaseUtils.query(`
        INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testRecipeIngredientId, testProductId, 2.0]);
      const linkId = linkResult.rows[0].id;

      const result = await RecipeIngredientProductQueries.deleteLink(linkId);
      expect(result).toBe(true);

      // Verify link was deleted
      const checkResult = await DatabaseUtils.query(`
        SELECT id FROM recipe_ingredient_products WHERE id = $1
      `, [linkId]);
      expect(checkResult.rows).toHaveLength(0);
    });
  });
});