import { describe, it, expect } from 'vitest';
import { validateRecipe, validateIngredient, validateStep, validateCompleteRecipe } from '../utils/validation.js';

describe('Recipe Validation', () => {
  describe('validateRecipe', () => {
    it('should validate a valid recipe', () => {
      const recipe = {
        name: 'Test Recipe',
        category: 'food',
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: 'medium'
      };

      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require name field', () => {
      const recipe = { category: 'food' };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name is required'
      });
    });

    it('should reject empty name', () => {
      const recipe = { name: '   ', category: 'food' };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name cannot be empty'
      });
    });

    it('should reject name longer than 200 characters', () => {
      const recipe = { 
        name: 'a'.repeat(201), 
        category: 'food' 
      };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name must be 200 characters or less'
      });
    });

    it('should require category field', () => {
      const recipe = { name: 'Test Recipe' };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'category',
        message: 'Category is required'
      });
    });

    it('should only accept food or drink categories', () => {
      const recipe = { name: 'Test Recipe', category: 'invalid' };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'category',
        message: 'Category must be "food" or "drink"'
      });
    });

    it('should validate prep_time as positive integer', () => {
      const recipe = { name: 'Test Recipe', category: 'food', prep_time: -5 };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prep_time',
        message: 'Preparation time must be a positive integer'
      });
    });

    it('should validate cook_time as positive integer', () => {
      const recipe = { name: 'Test Recipe', category: 'food', cook_time: 'invalid' };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cook_time',
        message: 'Cooking time must be a positive integer'
      });
    });

    it('should validate servings as positive integer', () => {
      const recipe = { name: 'Test Recipe', category: 'food', servings: 0 };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'servings',
        message: 'Servings must be a positive integer'
      });
    });

    it('should validate difficulty values', () => {
      const recipe = { name: 'Test Recipe', category: 'food', difficulty: 'impossible' };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'difficulty',
        message: 'Difficulty must be "easy", "medium", or "hard"'
      });
    });

    it('should allow optional fields to be undefined', () => {
      const recipe = { name: 'Test Recipe', category: 'food' };
      const result = validateRecipe(recipe);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateIngredient', () => {
    it('should validate a valid ingredient', () => {
      const ingredient = {
        product_id: 1,
        quantity: 2.5,
        unit: 'cups',
        notes: 'All-purpose flour'
      };

      const result = validateIngredient(ingredient);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require product_id field', () => {
      const ingredient = { quantity: 2 };
      const result = validateIngredient(ingredient);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product ID is required and must be a number'
      });
    });

    it('should reject invalid product_id', () => {
      const ingredient = { product_id: 'invalid' };
      const result = validateIngredient(ingredient);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product ID is required and must be a number'
      });
    });

    it('should validate quantity as positive number', () => {
      const ingredient = { product_id: 1, quantity: -1 };
      const result = validateIngredient(ingredient);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity',
        message: 'Quantity must be a positive number'
      });
    });

    it('should reject invalid quantity values', () => {
      const ingredient = { product_id: 1, quantity: 'invalid' };
      const result = validateIngredient(ingredient);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity',
        message: 'Quantity must be a positive number'
      });
    });

    it('should validate unit as string', () => {
      const ingredient = { product_id: 1, unit: 123 };
      const result = validateIngredient(ingredient);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'unit',
        message: 'Unit must be a string'
      });
    });

    it('should allow optional fields to be undefined', () => {
      const ingredient = { product_id: 1 };
      const result = validateIngredient(ingredient);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateStep', () => {
    it('should validate a valid step', () => {
      const step = {
        step_number: 1,
        instruction: 'Mix ingredients together',
        timing: 5
      };

      const result = validateStep(step);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require instruction field', () => {
      const step = { step_number: 1 };
      const result = validateStep(step);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instruction',
        message: 'Step instruction is required'
      });
    });

    it('should reject empty instruction', () => {
      const step = { instruction: '   ' };
      const result = validateStep(step);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instruction',
        message: 'Step instruction cannot be empty'
      });
    });

    it('should validate step_number as positive integer', () => {
      const step = { instruction: 'Mix ingredients', step_number: 0 };
      const result = validateStep(step);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'step_number',
        message: 'Step number must be a positive integer'
      });
    });

    it('should validate timing as non-negative integer', () => {
      const step = { instruction: 'Mix ingredients', timing: -1 };
      const result = validateStep(step);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'timing',
        message: 'Step timing must be a non-negative integer'
      });
    });

    it('should allow optional fields to be undefined', () => {
      const step = { instruction: 'Mix ingredients' };
      const result = validateStep(step);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateCompleteRecipe', () => {
    it('should validate a complete valid recipe', () => {
      const recipeData = {
        name: 'Chocolate Cake',
        category: 'food',
        prep_time: 20,
        cook_time: 45,
        servings: 8,
        difficulty: 'medium',
        ingredients: [
          { product_id: 1, quantity: 2, unit: 'cups' },
          { product_id: 2, quantity: 1.5, unit: 'cups' }
        ],
        steps: [
          { step_number: 1, instruction: 'Preheat oven to 350°F' },
          { step_number: 2, instruction: 'Mix dry ingredients' }
        ]
      };

      const result = validateCompleteRecipe(recipeData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require at least one ingredient', () => {
      const recipeData = {
        name: 'Test Recipe',
        category: 'food',
        ingredients: []
      };

      const result = validateCompleteRecipe(recipeData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'ingredients',
        message: 'At least one ingredient is required'
      });
    });

    it('should validate individual ingredients', () => {
      const recipeData = {
        name: 'Test Recipe',
        category: 'food',
        ingredients: [
          { product_id: 1 },
          { product_id: 'invalid', quantity: -1 }
        ]
      };

      const result = validateCompleteRecipe(recipeData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'ingredients[1].product_id',
        message: 'Product ID is required and must be a number'
      });
      expect(result.errors).toContainEqual({
        field: 'ingredients[1].quantity',
        message: 'Quantity must be a positive number'
      });
    });

    it('should validate individual steps', () => {
      const recipeData = {
        name: 'Test Recipe',
        category: 'food',
        ingredients: [{ product_id: 1 }],
        steps: [
          { step_number: 1, instruction: 'Valid step' },
          { step_number: 2, instruction: '' }
        ]
      };

      const result = validateCompleteRecipe(recipeData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'steps[1].instruction',
        message: 'Step instruction is required'
      });
    });

    it('should validate sequential step numbering', () => {
      const recipeData = {
        name: 'Test Recipe',
        category: 'food',
        ingredients: [{ product_id: 1 }],
        steps: [
          { step_number: 1, instruction: 'First step' },
          { step_number: 3, instruction: 'Third step' }
        ]
      };

      const result = validateCompleteRecipe(recipeData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'steps',
        message: 'Step numbers must be sequential starting from 1'
      });
    });

    it('should accumulate all validation errors', () => {
      const recipeData = {
        name: '',
        category: 'invalid',
        ingredients: [],
        steps: [{ instruction: '' }]
      };

      const result = validateCompleteRecipe(recipeData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });
});