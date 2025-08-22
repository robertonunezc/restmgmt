/**
 * Unit tests for RecipeIngredientProductLink model and validation
 * Tests Requirements: 2.1, 2.2
 */

import { describe, it, expect } from 'vitest';
const { 
  RecipeIngredientProductLink, 
  validateRecipeIngredientProductLink,
  validateRecipeIngredientProductLinkForCreation,
  validateRecipeIngredientProductRelationship
} = require('../models/RecipeIngredientProductLink.js');

describe('RecipeIngredientProductLink Model', () => {
  describe('Constructor', () => {
    it('should create link with default values', () => {
      const link = new RecipeIngredientProductLink();
      
      expect(link.id).toBeNull();
      expect(link.recipe_ingredient_id).toBeNull();
      expect(link.product_id).toBeNull();
      expect(link.quantity_per_serving).toBeNull();
      expect(link.created_at).toBeNull();
    });

    it('should create link with provided data', () => {
      const linkData = {
        id: 1,
        recipe_ingredient_id: 5,
        product_id: 10,
        quantity_per_serving: 2.5,
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const link = new RecipeIngredientProductLink(linkData);
      
      expect(link.id).toBe(1);
      expect(link.recipe_ingredient_id).toBe(5);
      expect(link.product_id).toBe(10);
      expect(link.quantity_per_serving).toBe(2.5);
      expect(link.created_at).toBe('2024-01-01T00:00:00Z');
    });

    it('should parse quantity_per_serving as float', () => {
      const link = new RecipeIngredientProductLink({ quantity_per_serving: '3.14' });
      expect(link.quantity_per_serving).toBe(3.14);
    });
  });

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      const linkData = {
        id: 1,
        recipe_ingredient_id: 5,
        product_id: 10,
        quantity_per_serving: 2.5,
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const link = new RecipeIngredientProductLink(linkData);
      const json = link.toJSON();
      
      expect(json).toEqual(linkData);
    });
  });

  describe('validate', () => {
    it('should validate complete valid link', () => {
      const link = new RecipeIngredientProductLink({
        recipe_ingredient_id: 5,
        product_id: 10,
        quantity_per_serving: 2.5
      });
      
      const result = link.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should call validateRecipeIngredientProductLink', () => {
      const link = new RecipeIngredientProductLink({
        recipe_ingredient_id: 5,
        product_id: 10,
        quantity_per_serving: 2.5
      });
      
      const result = link.validate();
      
      // Should be same as calling the function directly
      const directResult = validateRecipeIngredientProductLink(link);
      expect(result).toEqual(directResult);
    });
  });

  describe('validateForCreation', () => {
    it('should validate for creation without id and timestamps', () => {
      const link = new RecipeIngredientProductLink({
        recipe_ingredient_id: 5,
        product_id: 10,
        quantity_per_serving: 2.5
      });
      
      const result = link.validateForCreation();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('validateRecipeIngredientProductLink', () => {
  it('should validate complete valid link data', () => {
    const linkData = {
      recipe_ingredient_id: 5,
      product_id: 10,
      quantity_per_serving: 2.5
    };
    
    const result = validateRecipeIngredientProductLink(linkData);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('recipe_ingredient_id validation', () => {
    it('should require recipe_ingredient_id', () => {
      const linkData = {
        product_id: 10,
        quantity_per_serving: 2.5
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient ID is required'
      });
    });

    it('should reject null recipe_ingredient_id', () => {
      const linkData = {
        recipe_ingredient_id: null,
        product_id: 10,
        quantity_per_serving: 2.5
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient ID is required'
      });
    });

    it('should reject non-integer recipe_ingredient_id', () => {
      const linkData = {
        recipe_ingredient_id: 5.5,
        product_id: 10,
        quantity_per_serving: 2.5
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient ID must be a positive integer'
      });
    });

    it('should reject zero or negative recipe_ingredient_id', () => {
      const testCases = [0, -1, -5];
      
      testCases.forEach(id => {
        const linkData = {
          recipe_ingredient_id: id,
          product_id: 10,
          quantity_per_serving: 2.5
        };
        
        const result = validateRecipeIngredientProductLink(linkData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'recipe_ingredient_id',
          message: 'Recipe ingredient ID must be a positive integer'
        });
      });
    });
  });

  describe('product_id validation', () => {
    it('should require product_id', () => {
      const linkData = {
        recipe_ingredient_id: 5,
        quantity_per_serving: 2.5
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product ID is required'
      });
    });

    it('should reject null product_id', () => {
      const linkData = {
        recipe_ingredient_id: 5,
        product_id: null,
        quantity_per_serving: 2.5
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product ID is required'
      });
    });

    it('should reject non-integer product_id', () => {
      const linkData = {
        recipe_ingredient_id: 5,
        product_id: 10.5,
        quantity_per_serving: 2.5
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product ID must be a positive integer'
      });
    });

    it('should reject zero or negative product_id', () => {
      const testCases = [0, -1, -10];
      
      testCases.forEach(id => {
        const linkData = {
          recipe_ingredient_id: 5,
          product_id: id,
          quantity_per_serving: 2.5
        };
        
        const result = validateRecipeIngredientProductLink(linkData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'product_id',
          message: 'Product ID must be a positive integer'
        });
      });
    });
  });

  describe('quantity_per_serving validation', () => {
    it('should require quantity_per_serving', () => {
      const linkData = {
        recipe_ingredient_id: 5,
        product_id: 10
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity_per_serving',
        message: 'Quantity per serving is required'
      });
    });

    it('should reject null quantity_per_serving', () => {
      const linkData = {
        recipe_ingredient_id: 5,
        product_id: 10,
        quantity_per_serving: null
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity_per_serving',
        message: 'Quantity per serving is required'
      });
    });

    it('should reject non-numeric quantity_per_serving', () => {
      const linkData = {
        recipe_ingredient_id: 5,
        product_id: 10,
        quantity_per_serving: 'invalid'
      };
      
      const result = validateRecipeIngredientProductLink(linkData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity_per_serving',
        message: 'Quantity per serving must be a positive number'
      });
    });

    it('should reject zero or negative quantity_per_serving', () => {
      const testCases = [0, -1, -2.5];
      
      testCases.forEach(quantity => {
        const linkData = {
          recipe_ingredient_id: 5,
          product_id: 10,
          quantity_per_serving: quantity
        };
        
        const result = validateRecipeIngredientProductLink(linkData);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'quantity_per_serving',
          message: 'Quantity per serving must be a positive number'
        });
      });
    });

    it('should accept valid positive numbers', () => {
      const testCases = [0.1, 1, 2.5, 100.75];
      
      testCases.forEach(quantity => {
        const linkData = {
          recipe_ingredient_id: 5,
          product_id: 10,
          quantity_per_serving: quantity
        };
        
        const result = validateRecipeIngredientProductLink(linkData);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  it('should accumulate multiple validation errors', () => {
    const linkData = {
      recipe_ingredient_id: -1,
      product_id: 0,
      quantity_per_serving: -2.5
    };
    
    const result = validateRecipeIngredientProductLink(linkData);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.errors).toContainEqual({
      field: 'recipe_ingredient_id',
      message: 'Recipe ingredient ID must be a positive integer'
    });
    expect(result.errors).toContainEqual({
      field: 'product_id',
      message: 'Product ID must be a positive integer'
    });
    expect(result.errors).toContainEqual({
      field: 'quantity_per_serving',
      message: 'Quantity per serving must be a positive number'
    });
  });
});

describe('validateRecipeIngredientProductLinkForCreation', () => {
  it('should validate for creation ignoring id and timestamps', () => {
    const linkData = {
      id: 1,
      recipe_ingredient_id: 5,
      product_id: 10,
      quantity_per_serving: 2.5,
      created_at: '2024-01-01T00:00:00Z'
    };
    
    const result = validateRecipeIngredientProductLinkForCreation(linkData);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should still validate required fields for creation', () => {
    const linkData = {
      id: 1,
      created_at: '2024-01-01T00:00:00Z'
      // Missing required fields
    };
    
    const result = validateRecipeIngredientProductLinkForCreation(linkData);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateRecipeIngredientProductRelationship', () => {
  it('should validate valid IDs', () => {
    const result = validateRecipeIngredientProductRelationship(5, 10);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid recipe ingredient ID', () => {
    const testCases = [0, -1, 5.5, 'invalid'];
    
    testCases.forEach(id => {
      const result = validateRecipeIngredientProductRelationship(id, 10);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'recipe_ingredient_id',
        message: 'Recipe ingredient ID must be a positive integer'
      });
    });
  });

  it('should reject invalid product ID', () => {
    const testCases = [0, -1, 10.5, 'invalid'];
    
    testCases.forEach(id => {
      const result = validateRecipeIngredientProductRelationship(5, id);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'product_id',
        message: 'Product ID must be a positive integer'
      });
    });
  });

  it('should accumulate errors for both invalid IDs', () => {
    const result = validateRecipeIngredientProductRelationship(-1, 0);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContainEqual({
      field: 'recipe_ingredient_id',
      message: 'Recipe ingredient ID must be a positive integer'
    });
    expect(result.errors).toContainEqual({
      field: 'product_id',
      message: 'Product ID must be a positive integer'
    });
  });
});