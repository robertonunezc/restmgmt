const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db-connection');

// Get all tables
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tables ORDER BY table_number');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update table status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tables SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;