const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db-connection');

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new menu item
router.post('/', async (req, res) => {
  const { name, description, price, category, available } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO menu_items (name, description, price, category, available) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, category, available || true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update menu item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, available } = req.body;
  try {
    const result = await pool.query(
      'UPDATE menu_items SET name = $1, description = $2, price = $3, category = $4, available = $5 WHERE id = $6 RETURNING *',
      [name, description, price, category, available, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete menu item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;