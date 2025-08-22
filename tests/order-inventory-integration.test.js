/**
 * Integration tests for Order-Inventory workflow
 * Tests the integration between order processing and inventory updates
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { DatabaseUtils } from '../utils/database.js';
import request from 'supertest';

// Import the server using dynamic import since it's CommonJS
let app;
beforeAll(async () => {
  const serverModule = await import('../server.js');
  app = serverModule.app;
});

describe('Order-Inventory Integration', () => {
  let testRecipeId, testProductIds, testMenuItemId, testOrderId;

  beforeEach(async () => {
    // Clean up any existing test data
    await DatabaseUtils.query('DELETE FROM inventory_transactions WHERE reference_id IN (SELECT id FROM orders WHERE customer_name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM orders WHERE customer_name LIKE $1', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM menu_items WHERE name LIKE $1', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredient_products WHERE product_id IN (SELECT id FROM products WHERE name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM recipes WHERE name LIKE $1', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM products WHERE name LIKE $1', ['Test Integration%']);

    // Create test recipe
    const recipeResult = await DatabaseUtils.query(`
      INSERT INTO recipes (name, description, category, servings)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Test Integration Pizza', 'Test pizza recipe for integration', 'food', 4]);
    testRecipeId = recipeResult.rows[0].id;

    // Create test products
    const product1Result = await DatabaseUtils.query(`
      INSERT INTO products (name, unit_of_measure, current_quantity, low_stock_threshold)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Test Integration Flour', 'kg', 100.0, 10]);
    
    const product2Result = await DatabaseUtils.query(`
      INSERT INTO products (name, unit_of_measure, current_quantity, low_stock_threshold)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Test Integration Cheese', 'kg', 50.0, 5]);

    testProductIds = [product1Result.rows[0].id, product2Result.rows[0].id];

    // Create test recipe ingredients
    const ingredient1Result = await DatabaseUtils.query(`
      INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [testRecipeId, 'Flour', 2.0, 'kg', 1]);

    const ingredient2Result = await DatabaseUtils.query(`
      INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [testRecipeId, 'Cheese', 0.8, 'kg', 2]);

    // Create recipe ingredient product links
    await DatabaseUtils.query(`
      INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
      VALUES ($1, $2, $3)
    `, [ingredient1Result.rows[0].id, testProductIds[0], 0.5]); // 2kg / 4 servings = 0.5kg per serving

    await DatabaseUtils.query(`
      INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
      VALUES ($1, $2, $3)
    `, [ingredient2Result.rows[0].id, testProductIds[1], 0.2]); // 0.8kg / 4 servings = 0.2kg per serving

    // Create test menu item
    const menuItemResult = await DatabaseUtils.query(`
      INSERT INTO menu_items (recipe_id, name, description, price, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [testRecipeId, 'Test Integration Pizza', 'Test pizza menu item for integration', 18.99, 'Pizza']);
    testMenuItemId = menuItemResult.rows[0].id;

    // Create test order
    const orderResult = await DatabaseUtils.query(`
      INSERT INTO orders (customer_name, status, total)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['Test Integration Customer', 'pending', 0]);
    testOrderId = orderResult.rows[0].id;

    // Add order items
    await DatabaseUtils.query(`
      INSERT INTO order_items (order_id, menu_item_id, quantity)
      VALUES ($1, $2, $3)
    `, [testOrderId, testMenuItemId, 2]); // 2 pizzas
  });

  afterEach(async () => {
    // Clean up test data
    await DatabaseUtils.query('DELETE FROM inventory_transactions WHERE reference_id IN (SELECT id FROM orders WHERE customer_name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM orders WHERE customer_name LIKE $1', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM menu_items WHERE name LIKE $1', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredient_products WHERE product_id IN (SELECT id FROM products WHERE name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE name LIKE $1)', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM recipes WHERE name LIKE $1', ['Test Integration%']);
    await DatabaseUtils.query('DELETE FROM products WHERE name LIKE $1', ['Test Integration%']);
  });

  describe('Order Status Update with Inventory Integration', () => {
    it('should automatically update inventory when order status changes to served', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'served' })
        .expect(200);

      expect(response.body.status).toBe('served');

      // Verify inventory was deducted
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(99.0); // 100 - (0.5 * 2 pizzas)

      const cheeseProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[1]]);
      expect(parseFloat(cheeseProduct.rows[0].current_quantity)).toBe(49.6); // 50 - (0.2 * 2 pizzas)

      // Verify transactions were created
      const transactions = await DatabaseUtils.query(
        'SELECT * FROM inventory_transactions WHERE reference_id = $1 AND reference_type = $2',
        [testOrderId, 'order']
      );
      expect(transactions.rows).toHaveLength(2);
    });

    it('should automatically update inventory when order status changes to paid', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'paid' })
        .expect(200);

      expect(response.body.status).toBe('paid');

      // Verify inventory was deducted
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(99.0); // 100 - (0.5 * 2 pizzas)
    });

    it('should not update inventory twice if order status changes from served to paid', async () => {
      // First change to served
      await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'served' })
        .expect(200);

      // Then change to paid
      await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'paid' })
        .expect(200);

      // Verify inventory was only deducted once
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(99.0); // Should still be 99, not 98

      // Verify only 2 transactions exist (one per product)
      const transactions = await DatabaseUtils.query(
        'SELECT * FROM inventory_transactions WHERE reference_id = $1 AND reference_type = $2',
        [testOrderId, 'order']
      );
      expect(transactions.rows).toHaveLength(2);
    });

    it('should fail order completion when insufficient inventory exists', async () => {
      // Reduce flour inventory to insufficient level
      await DatabaseUtils.query(`
        UPDATE products SET current_quantity = $1 WHERE id = $2
      `, [0.5, testProductIds[0]]); // Only 0.5kg flour available, need 1.0kg

      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'served' })
        .expect(400);

      expect(response.body.error).toBe('Insufficient inventory to complete order');
      expect(response.body.details).toHaveLength(1);
      expect(response.body.details[0].product_name).toBe('Test Integration Flour');

      // Verify order status was not changed
      const orderResult = await DatabaseUtils.query('SELECT status FROM orders WHERE id = $1', [testOrderId]);
      expect(orderResult.rows[0].status).toBe('pending');

      // Verify no inventory transactions were created
      const transactions = await DatabaseUtils.query(
        'SELECT * FROM inventory_transactions WHERE reference_id = $1 AND reference_type = $2',
        [testOrderId, 'order']
      );
      expect(transactions.rows).toHaveLength(0);
    });

    it('should not update inventory for other status changes', async () => {
      await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'preparing' })
        .expect(200);

      // Verify inventory was not changed
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(100.0); // Should remain unchanged

      // Verify no transactions were created
      const transactions = await DatabaseUtils.query(
        'SELECT * FROM inventory_transactions WHERE reference_id = $1 AND reference_type = $2',
        [testOrderId, 'order']
      );
      expect(transactions.rows).toHaveLength(0);
    });
  });

  describe('Manual Inventory Processing Endpoints', () => {
    it('should manually process inventory updates for an order', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/process-inventory`)
        .send({})
        .expect(200);

      expect(response.body.message).toContain(`order #${testOrderId}`);
      expect(response.body.transactionCount).toBe(2);
      expect(response.body.transactions).toHaveLength(2);

      // Verify inventory was deducted
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(99.0);
    });

    it('should fail manual processing with insufficient inventory', async () => {
      // Reduce flour inventory
      await DatabaseUtils.query(`
        UPDATE products SET current_quantity = $1 WHERE id = $2
      `, [0.5, testProductIds[0]]);

      const response = await request(app)
        .post(`/api/orders/${testOrderId}/process-inventory`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Failed to process inventory updates');
      expect(response.body.details[0].type).toBe('insufficient_inventory');
    });

    it('should allow manual processing with insufficient inventory when skipped', async () => {
      // Reduce flour inventory
      await DatabaseUtils.query(`
        UPDATE products SET current_quantity = $1 WHERE id = $2
      `, [0.5, testProductIds[0]]);

      const response = await request(app)
        .post(`/api/orders/${testOrderId}/process-inventory`)
        .send({ skipInventoryCheck: true })
        .expect(200);

      expect(response.body.transactionCount).toBe(2);

      // Verify inventory went negative
      const flourProduct = await DatabaseUtils.query('SELECT current_quantity FROM products WHERE id = $1', [testProductIds[0]]);
      expect(parseFloat(flourProduct.rows[0].current_quantity)).toBe(-0.5); // 0.5 - 1.0
    });

    it('should check inventory availability for an order', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}/inventory-check`)
        .expect(200);

      expect(parseInt(response.body.orderId)).toBe(testOrderId);
      expect(response.body.isValid).toBe(true);
      expect(response.body.insufficientItems).toHaveLength(0);
      expect(response.body.ingredientQuantities).toHaveLength(2);
    });

    it('should detect insufficient inventory in availability check', async () => {
      // Reduce cheese inventory
      await DatabaseUtils.query(`
        UPDATE products SET current_quantity = $1 WHERE id = $2
      `, [0.2, testProductIds[1]]); // Only 0.2kg available, need 0.4kg

      const response = await request(app)
        .get(`/api/orders/${testOrderId}/inventory-check`)
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.insufficientItems).toHaveLength(1);
      expect(response.body.insufficientItems[0].product_name).toBe('Test Integration Cheese');
      expect(response.body.insufficientItems[0].shortage).toBe(0.2);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .post('/api/orders/99999/process-inventory')
        .send({})
        .expect(404);

      await request(app)
        .get('/api/orders/99999/inventory-check')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle orders with menu items without recipes gracefully', async () => {
      // Create menu item without recipe
      const menuItemResult = await DatabaseUtils.query(`
        INSERT INTO menu_items (name, description, price, category)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['Test Integration No Recipe', 'Menu item without recipe', 9.99, 'Other']);

      // Add to order
      await DatabaseUtils.query(`
        INSERT INTO order_items (order_id, menu_item_id, quantity)
        VALUES ($1, $2, $3)
      `, [testOrderId, menuItemResult.rows[0].id, 1]);

      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'served' })
        .expect(200);

      // Should still process the items with recipes
      const transactions = await DatabaseUtils.query(
        'SELECT * FROM inventory_transactions WHERE reference_id = $1 AND reference_type = $2',
        [testOrderId, 'order']
      );
      expect(transactions.rows).toHaveLength(2); // Only the pizza ingredients
    });

    it('should handle database errors gracefully', async () => {
      // Try to update status for non-existent order
      const response = await request(app)
        .put('/api/orders/99999/status')
        .send({ status: 'served' })
        .expect(404);

      expect(response.body.error).toBe('Order not found');
    });
  });
});