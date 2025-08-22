const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db-connection');

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
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;