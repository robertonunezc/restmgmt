/**
 * Tests for Order Inventory Service
 * Tests order processing inventory integration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseUtils } from '../utils/database.js';
import { OrderInventoryService } from '../utils/order-inventory-service.js';

describe('OrderInventoryService', () => {
  let testRecipeId, testProductIds, testMenuItemId, testOrderId;

  beforeEach(async () => {
    // Clean up any existing test data in correct order
    await DatabaseUtils.query('DELETE FROM inventory_transactions WHERE reference_type = $1 OR reference_id IN (SELECT id FROM orders WHERE customer_name LIKE $2)', ['test', 'Test Customer%']);
    await DatabaseUtils.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE $1)', ['Test Customer%']);
    await DatabaseUtils.query('DELETE FROM orders WHERE customer_name LIKE $1', ['Test Customer%']);
    await DatabaseUtils.query('DELETE FROM menu_items WHERE name LIKE $1', ['Test Menu%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredient_products WHERE product_id IN (SELECT id FROM products WHERE name LIKE $1)', ['Test Product%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE name LIKE $1)', ['Test Recipe%']);
    await DatabaseUtils.query('DELETE FROM recipes WHERE name LIKE $1', ['Test Recipe%']);
    await DatabaseUtils.query('DELETE FROM products WHERE name LIKE $1', ['Test Product%']);

    // Create test recipe
    const recipeResult = await DatabaseUtils.query(`
      INSERT INTO recipes (name, description, category, servings)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Test Recipe Pizza', 'Test pizza recipe', 'food', 4]);
    testRecipeId = recipeResult.rows[0].id;

    // Create test products
    const product1Result = await DatabaseUtils.query(`
      INSERT INTO products (name, unit_of_measure, current_quantity, low_stock_threshold)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Test Product Flour', 'kg', 50.0, 10]);
    
    const product2Result = await DatabaseUtils.query(`
      INSERT INTO products (name, unit_of_measure, current_quantity, low_stock_threshold)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Test Product Cheese', 'kg', 20.0, 5]);

    testProductIds = [product1Result.rows[0].id, product2Result.rows[0].id];

    // Create test recipe ingredients
    const ingredient1Result = await DatabaseUtils.query(`
      INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [testRecipeId, 'Flour', 0.5, 'kg', 1]);

    const ingredient2Result = await DatabaseUtils.query(`
      INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [testRecipeId, 'Cheese', 0.2, 'kg', 2]);

    // Create recipe ingredient product links
    await DatabaseUtils.query(`
      INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
      VALUES ($1, $2, $3)
    `, [ingredient1Result.rows[0].id, testProductIds[0], 0.125]); // 0.5kg / 4 servings = 0.125kg per serving

    await DatabaseUtils.query(`
      INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
      VALUES ($1, $2, $3)
    `, [ingredient2Result.rows[0].id, testProductIds[1], 0.05]); // 0.2kg / 4 servings = 0.05kg per serving

    // Create test menu item
    const menuItemResult = await DatabaseUtils.query(`
      INSERT INTO menu_items (recipe_id, name, description, price, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [testRecipeId, 'Test Menu Pizza', 'Test pizza menu item', 15.99, 'Pizza']);
    testMenuItemId = menuItemResult.rows[0].id;

    // Create test order
    const orderResult = await DatabaseUtils.query(`
      INSERT INTO orders (customer_name, status, total)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['Test Customer', 'pending', 0]);
    testOrderId = orderResult.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data in correct order to avoid foreign key constraints
    await DatabaseUtils.query('DELETE FROM inventory_transactions WHERE reference_type = $1 OR reference_id IN (SELECT id FROM orders WHERE customer_name LIKE $2)', ['test', 'Test Customer%']);
    await DatabaseUtils.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE $1)', ['Test Customer%']);
    await DatabaseUtils.query('DELETE FROM orders WHERE customer_name LIKE $1', ['Test Customer%']);
    await DatabaseUtils.query('DELETE FROM menu_items WHERE name LIKE $1', ['Test Menu%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredient_products WHERE product_id IN (SELECT id FROM products WHERE name LIKE $1)', ['Test Product%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE name LIKE $1)', ['Test Recipe%']);
    await DatabaseUtils.query('DELETE FROM recipes WHERE name LIKE $1', ['Test Recipe%']);
    await DatabaseUtils.query('DELETE FROM products WHERE name LIKE $1', ['Test Product%']);
  });

  describe('calculateIngredientQuantities', () => {
    it('should calculate ingredient quantities for recipe servings', async () => {
      const result = await OrderInventoryService.calculateIngredientQuantities(testRecipeId, 2);
      
      expect(result).toHaveLength(2);
      
      const flourIngredient = result.find(r => r.product_name === 'Test Product Flour');
      expect(flourIngredient).toBeDefined();
      expect(parseFloat(flourIngredient.quantity_per_serving)).toBe(0.125);
      expect(parseFloat(flourIngredient.total_quantity_needed)).toBe(0.25); // 0.125 * 2 servings
      expect(parseFloat(flourIngredient.current_quantity)).toBe(50.0);
      
      const cheeseIngredient = result.find(r => r.product_name === 'Test Product Cheese');
      expect(cheeseIngredient).toBeDefined();
      expect(parseFloat(cheeseIngredient.quantity_per_serving)).toBe(0.05);
      expect(parseFloat(cheeseIngredient.total_quantity_needed)).toBe(0.1); // 0.05 * 2 servings
      expect(parseFloat(cheeseIngredient.current_quantity)).toBe(20.0);
    });

    it('should return empty array for recipe with no ingredient links', async () => {
      // Create recipe without ingredient links
      const recipeResult = await DatabaseUtils.query(`
        INSERT INTO recipes (name, description, category, servings)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['Test Recipe No Links', 'Recipe without links', 'food', 1]);
      
      const result = await OrderInventoryService.calculateIngredientQuantities(recipeResult.rows[0].id, 1);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateOrderIngredientQuantities', () => {
    it('should calculate consolidated ingredient quantities for multiple order items', async () => {
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 2 }, // 2 pizzas
        { menu_item_id: testMenuItemId, quantity: 1 }  // 1 more pizza
      ];
      
      const result = await OrderInventoryService.calculateOrderIngredientQuantities(orderItems);
      
      expect(result).toHaveLength(2);
      
      const flourIngredient = result.find(r => r.product_name === 'Test Product Flour');
      expect(flourIngredient).toBeDefined();
      expect(flourIngredient.total_quantity_needed).toBe(0.375); // 0.125 * 3 total pizzas
      
      const cheeseIngredient = result.find(r => r.product_name === 'Test Product Cheese');
      expect(cheeseIngredient).toBeDefined();
      expect(cheeseIngredient.total_quantity_needed).toBeCloseTo(0.15, 10); // 0.05 * 3 total pizzas
    });

    it('should skip menu items without recipes', async () => {
      // Create menu item without recipe
      const menuItemResult = await DatabaseUtils.query(`
        INSERT INTO menu_items (name, description, price, category)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['Test Menu No Recipe', 'Menu item without recipe', 9.99, 'Other']);
      
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 1 },
        { menu_item_id: menuItemResult.rows[0].id, quantity: 1 }
      ];
      
      const result = await OrderInventoryService.calculateOrderIngredientQuantities(orderItems);
      
      // Should only include ingredients from the menu item with recipe
      expect(result).toHaveLength(2);
      expect(result.every(r => r.product_name.includes('Test Product'))).toBe(true);
    });
  });

  describe('checkInventoryAvailability', () => {
    it('should return valid when sufficient inventory exists', async () => {
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 2 } // Needs 0.25kg flour, 0.1kg cheese
      ];
      
      const result = await OrderInventoryService.checkInventoryAvailability(orderItems);
      
      expect(result.isValid).toBe(true);
      expect(result.insufficientItems).toHaveLength(0);
      expect(result.ingredientQuantities).toHaveLength(2);
    });

    it('should return invalid when insufficient inventory exists', async () => {
      // Reduce cheese inventory to insufficient level
      await DatabaseUtils.query(`
        UPDATE products SET current_quantity = $1 WHERE id = $2
      `, [0.05, testProductIds[1]]); // Only 0.05kg cheese available
      
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 2 } // Needs 0.1kg cheese
      ];
      
      const result = await OrderInventoryService.checkInventoryAvailability(orderItems);
      
      expect(result.isValid).toBe(false);
      expect(result.insufficientItems).toHaveLength(1);
      
      const insufficientItem = result.insufficientItems[0];
      expect(insufficientItem.product_name).toBe('Test Product Cheese');
      expect(insufficientItem.required).toBe(0.1);
      expect(insufficientItem.available).toBe(0.05);
      expect(insufficientItem.shortage).toBe(0.05);
    });
  });

  describe('processOrderInventoryDeduction', () => {
    it('should successfully process inventory deduction for valid order', async () => {
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 1 }
      ];
      
      const result = await OrderInventoryService.processOrderInventoryDeduction(testOrderId, orderItems);
      
      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
      expect(result.message).toContain(`order #${testOrderId}`);
      
      // Verify inventory was deducted
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(49.875); // 50 - 0.125
      
      const cheeseProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[1]]);
      expect(parseFloat(cheeseProduct.rows[0].current_quantity)).toBe(19.95); // 20 - 0.05
    });

    it('should fail when insufficient inventory and check not skipped', async () => {
      // Reduce flour inventory to insufficient level
      await DatabaseUtils.query(`
        UPDATE products SET current_quantity = $1 WHERE id = $2
      `, [0.1, testProductIds[0]]); // Only 0.1kg flour available
      
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 1 } // Needs 0.125kg flour
      ];
      
      const result = await OrderInventoryService.processOrderInventoryDeduction(testOrderId, orderItems);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('insufficient_inventory');
      expect(result.errors[0].details).toHaveLength(1);
    });

    it('should succeed when insufficient inventory but check is skipped', async () => {
      // Reduce flour inventory to insufficient level
      await DatabaseUtils.query(`
        UPDATE products SET current_quantity = $1 WHERE id = $2
      `, [0.1, testProductIds[0]]); // Only 0.1kg flour available
      
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 1 } // Needs 0.125kg flour
      ];
      
      const result = await OrderInventoryService.processOrderInventoryDeduction(
        testOrderId, 
        orderItems, 
        { skipInventoryCheck: true }
      );
      
      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
      
      // Verify inventory went negative
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(-0.025); // 0.1 - 0.125
    });
  });

  describe('batchUpdateInventory', () => {
    it('should process batch inventory updates in single transaction', async () => {
      const updates = [
        {
          product_id: testProductIds[0],
          quantity_change: -5.0,
          notes: 'Test batch update flour'
        },
        {
          product_id: testProductIds[1],
          quantity_change: -2.0,
          notes: 'Test batch update cheese'
        }
      ];
      
      const result = await OrderInventoryService.batchUpdateInventory(updates, testOrderId);
      
      expect(result).toHaveLength(2);
      expect(result.every(t => t.reference_id === testOrderId)).toBe(true);
      expect(result.every(t => t.transaction_type === 'sale')).toBe(true);
      
      // Verify inventory was updated
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(45.0); // 50 - 5
      
      const cheeseProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[1]]);
      expect(parseFloat(cheeseProduct.rows[0].current_quantity)).toBe(18.0); // 20 - 2
    });
  });

  describe('getOrderItems', () => {
    it('should retrieve order items with menu item details', async () => {
      // Add order items
      await DatabaseUtils.query(`
        INSERT INTO order_items (order_id, menu_item_id, quantity)
        VALUES ($1, $2, $3)
      `, [testOrderId, testMenuItemId, 2]);
      
      const result = await OrderInventoryService.getOrderItems(testOrderId);
      
      expect(result).toHaveLength(1);
      expect(result[0].menu_item_id).toBe(testMenuItemId);
      expect(result[0].quantity).toBe(2);
      expect(result[0].menu_item_name).toBe('Test Menu Pizza');
      expect(result[0].recipe_id).toBe(testRecipeId);
    });

    it('should return empty array for order with no items', async () => {
      const result = await OrderInventoryService.getOrderItems(testOrderId);
      expect(result).toHaveLength(0);
    });
  });

  describe('processExistingOrderInventoryUpdate', () => {
    it('should process inventory update for existing order with items', async () => {
      // Add order items
      await DatabaseUtils.query(`
        INSERT INTO order_items (order_id, menu_item_id, quantity)
        VALUES ($1, $2, $3)
      `, [testOrderId, testMenuItemId, 1]);
      
      const result = await OrderInventoryService.processExistingOrderInventoryUpdate(testOrderId);
      
      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
    });

    it('should fail for non-existent order', async () => {
      const result = await OrderInventoryService.processExistingOrderInventoryUpdate(99999);
      
      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe('order_not_found');
    });
  });

  describe('validateOrderItemsHaveRecipes', () => {
    it('should return valid when all menu items have recipes', async () => {
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 1 }
      ];
      
      const result = await OrderInventoryService.validateOrderItemsHaveRecipes(orderItems);
      
      expect(result.isValid).toBe(true);
      expect(result.itemsWithoutRecipes).toHaveLength(0);
    });

    it('should return invalid when menu items lack recipes', async () => {
      // Create menu item without recipe
      const menuItemResult = await DatabaseUtils.query(`
        INSERT INTO menu_items (name, description, price, category)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['Test Menu No Recipe', 'Menu item without recipe', 9.99, 'Other']);
      
      const orderItems = [
        { menu_item_id: testMenuItemId, quantity: 1 },
        { menu_item_id: menuItemResult.rows[0].id, quantity: 1 }
      ];
      
      const result = await OrderInventoryService.validateOrderItemsHaveRecipes(orderItems);
      
      expect(result.isValid).toBe(false);
      expect(result.itemsWithoutRecipes).toHaveLength(1);
      expect(result.itemsWithoutRecipes[0].menu_item_name).toBe('Test Menu No Recipe');
      expect(result.itemsWithoutRecipes[0].error).toBe('Menu item has no associated recipe');
    });

    it('should return invalid for non-existent menu items', async () => {
      const orderItems = [
        { menu_item_id: 99999, quantity: 1 }
      ];
      
      const result = await OrderInventoryService.validateOrderItemsHaveRecipes(orderItems);
      
      expect(result.isValid).toBe(false);
      expect(result.itemsWithoutRecipes).toHaveLength(1);
      expect(result.itemsWithoutRecipes[0].error).toBe('Menu item not found');
    });
  });
});