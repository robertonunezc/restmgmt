const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db-connection');
const OrderInventoryService = require('../utils/order-inventory-service-cjs.js');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, oi.menu_item_id, oi.quantity, mi.name as item_name, mi.price
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new order
router.post('/', async (req, res) => {
  const { table_id, items, customer_name } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (table_id, customer_name, status, total) VALUES ($1, $2, $3, $4) RETURNING *',
      [table_id, customer_name, 'pending', 0]
    );
    const orderId = orderResult.rows[0].id;
    
    let total = 0;
    
    // Add order items
    for (const item of items) {
      const menuItem = await client.query('SELECT price FROM menu_items WHERE id = $1', [item.menu_item_id]);
      const itemTotal = menuItem.rows[0].price * item.quantity;
      total += itemTotal;
      
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES ($1, $2, $3)',
        [orderId, item.menu_item_id, item.quantity]
      );
    }
    
    // Update order total
    await client.query('UPDATE orders SET total = $1 WHERE id = $2', [total, orderId]);
    
    await client.query('COMMIT');
    res.status(201).json({ ...orderResult.rows[0], total });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current order status
    const currentOrderResult = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (currentOrderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const currentStatus = currentOrderResult.rows[0].status;
    
    // Update order status
    const result = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    // If order is being marked as 'served' or 'paid' and wasn't already processed, update inventory
    if ((status === 'served' || status === 'paid') && 
        currentStatus !== 'served' && currentStatus !== 'paid') {
      
      try {
        // Process inventory updates for the order
        const inventoryResult = await OrderInventoryService.processExistingOrderInventoryUpdate(id, {
          skipInventoryCheck: false // Check inventory by default
        });
        
        if (!inventoryResult.success) {
          // Log inventory update failure but don't fail the order status update
          console.warn(`Inventory update failed for order ${id}:`, inventoryResult.errors);
          
          // Check if it's an insufficient inventory error
          const hasInsufficientInventory = inventoryResult.errors.some(
            error => error.type === 'insufficient_inventory'
          );
          
          if (hasInsufficientInventory) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              error: 'Insufficient inventory to complete order',
              details: inventoryResult.errors[0].details
            });
          }
        } else {
          console.log(`Successfully updated inventory for order ${id}:`, inventoryResult.transactions.length, 'transactions created');
        }
      } catch (inventoryError) {
        console.error(`Inventory update error for order ${id}:`, inventoryError);
        // Continue with order status update even if inventory update fails
      }
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Process inventory updates for an order (manual trigger)
router.post('/:id/process-inventory', async (req, res) => {
  const { id } = req.params;
  const { skipInventoryCheck = false } = req.body;
  
  try {
    const result = await OrderInventoryService.processExistingOrderInventoryUpdate(id, {
      skipInventoryCheck
    });
    
    if (result.success) {
      res.json({
        message: result.message,
        transactions: result.transactions,
        transactionCount: result.transactions.length
      });
    } else {
      const statusCode = result.errors.some(e => e.type === 'order_not_found') ? 404 : 400;
      res.status(statusCode).json({
        error: 'Failed to process inventory updates',
        details: result.errors
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check inventory availability for an order
router.get('/:id/inventory-check', async (req, res) => {
  const { id } = req.params;
  
  try {
    const orderItems = await OrderInventoryService.getOrderItems(id);
    
    if (orderItems.length === 0) {
      return res.status(404).json({ error: 'Order not found or has no items' });
    }
    
    const availabilityCheck = await OrderInventoryService.checkInventoryAvailability(orderItems);
    
    res.json({
      orderId: id,
      isValid: availabilityCheck.isValid,
      insufficientItems: availabilityCheck.insufficientItems,
      ingredientQuantities: availabilityCheck.ingredientQuantities
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;