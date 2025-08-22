import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseUtils, RecipeQueries } from '../utils/database.js';

describe('Database Utilities', () => {
  let testRecipeId;

  beforeAll(async () => {
    // Test database connection
    await DatabaseUtils.query('SELECT 1');
  });

  afterAll(async () => {
    // Clean up test data
    if (testRecipeId) {
      await DatabaseUtils.query('DELETE FROM recipes WHERE id = $1', [testRecipeId]);
    }
  });

  beforeEach(async () => {
    // Clean up any existing test recipes
    await DatabaseUtils.query("DELETE FROM recipes WHERE name LIKE 'Test Recipe%'");
  });

  describe('DatabaseUtils', () => {
    it('should execute a simple query', async () => {
      const result = await DatabaseUtils.query('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('current_time');
    });

    it('should execute a parameterized query', async () => {
      const result = await DatabaseUtils.query('SELECT $1 as test_value', ['hello']);
      expect(result.rows[0].test_value).toBe('hello');
    });

    it('should handle transaction rollback on error', async () => {
      try {
        await DatabaseUtils.transaction(async (client) => {
          await client.query('INSERT INTO recipes (name, category) VALUES ($1, $2)', ['Test Recipe', 'food']);
          // This should cause an error due to missing required ingredients
          throw new Error('Test error');
        });
      } catch (error) {
        expect(error.message).toBe('Test error');
      }

      // Verify the recipe was not created due to rollback
      const result = await DatabaseUtils.query("SELECT * FROM recipes WHERE name = 'Test Recipe'");
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('RecipeQueries', () => {
    it('should create a recipe with ingredients and steps', async () => {
      const recipeData = {
        name: 'Test Recipe - Database',
        category: 'food',
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: 'easy',
        ingredients: [
          { name: 'Test Ingredient 1', quantity: 1, unit: 'cup' },
          { name: 'Test Ingredient 2', quantity: 2, unit: 'tbsp' }
        ],
        steps: [
          { step_number: 1, instruction: 'First step', timing: 5 },
          { step_number: 2, instruction: 'Second step', timing: 10 }
        ]
      };

      const createdRecipe = await RecipeQueries.createRecipe(recipeData);
      testRecipeId = createdRecipe.id;

      expect(createdRecipe).toHaveProperty('id');
      expect(createdRecipe.name).toBe(recipeData.name);
      expect(createdRecipe.category).toBe(recipeData.category);
      expect(createdRecipe.prep_time).toBe(recipeData.prep_time);
      expect(createdRecipe.cook_time).toBe(recipeData.cook_time);
      expect(createdRecipe.servings).toBe(recipeData.servings);
      expect(createdRecipe.difficulty).toBe(recipeData.difficulty);

      // Verify ingredients were created
      const ingredients = await DatabaseUtils.query(
        'SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY order_index',
        [testRecipeId]
      );
      expect(ingredients.rows).toHaveLength(2);
      expect(ingredients.rows[0].name).toBe('Test Ingredient 1');
      expect(ingredients.rows[1].name).toBe('Test Ingredient 2');

      // Verify steps were created
      const steps = await DatabaseUtils.query(
        'SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number',
        [testRecipeId]
      );
      expect(steps.rows).toHaveLength(2);
      expect(steps.rows[0].instruction).toBe('First step');
      expect(steps.rows[1].instruction).toBe('Second step');
    });

    it('should get recipe by id with full details', async () => {
      // First create a recipe
      const recipeData = {
        name: 'Test Recipe - Get By ID',
        category: 'drink',
        ingredients: [{ name: 'Test Ingredient' }],
        steps: [{ step_number: 1, instruction: 'Test step' }]
      };

      const createdRecipe = await RecipeQueries.createRecipe(recipeData);
      testRecipeId = createdRecipe.id;

      // Now get it back
      const retrievedRecipe = await RecipeQueries.getRecipeById(testRecipeId);

      expect(retrievedRecipe).not.toBeNull();
      expect(retrievedRecipe.id).toBe(testRecipeId);
      expect(retrievedRecipe.name).toBe(recipeData.name);
      expect(retrievedRecipe.ingredients).toHaveLength(1);
      expect(retrievedRecipe.steps).toHaveLength(1);
      expect(retrievedRecipe.ingredients[0].name).toBe('Test Ingredient');
      expect(retrievedRecipe.steps[0].instruction).toBe('Test step');
    });

    it('should return null for non-existent recipe', async () => {
      const recipe = await RecipeQueries.getRecipeById(99999);
      expect(recipe).toBeNull();
    });

    it('should get recipes with filtering', async () => {
      // Create test recipes
      const foodRecipe = await RecipeQueries.createRecipe({
        name: 'Test Recipe - Food Item',
        category: 'food',
        ingredients: [{ name: 'Test Ingredient' }]
      });

      const drinkRecipe = await RecipeQueries.createRecipe({
        name: 'Test Recipe - Drink Item',
        category: 'drink',
        ingredients: [{ name: 'Test Ingredient' }]
      });

      // Test category filtering
      const foodRecipes = await RecipeQueries.getRecipes({ category: 'food' });
      const foodRecipeNames = foodRecipes.map(r => r.name);
      expect(foodRecipeNames).toContain('Test Recipe - Food Item');

      const drinkRecipes = await RecipeQueries.getRecipes({ category: 'drink' });
      const drinkRecipeNames = drinkRecipes.map(r => r.name);
      expect(drinkRecipeNames).toContain('Test Recipe - Drink Item');

      // Test search filtering
      const searchResults = await RecipeQueries.getRecipes({ search: 'Food Item' });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Test Recipe - Food Item');

      // Clean up
      await DatabaseUtils.query('DELETE FROM recipes WHERE id IN ($1, $2)', [foodRecipe.id, drinkRecipe.id]);
    });
  });
});