const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db-connection');

// Get all menu items with recipe information
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        mi.*,
        r.id as recipe_id,
        r.name as recipe_name,
        r.category as recipe_category,
        r.prep_time,
        r.cook_time,
        r.servings,
        r.difficulty,
        CASE 
          WHEN r.id IS NOT NULL THEN true 
          ELSE false 
        END as has_recipe
      FROM menu_items mi
      LEFT JOIN recipes r ON mi.recipe_id = r.id
      ORDER BY mi.category, mi.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new menu item (can be recipe-based or standalone)
router.post('/', async (req, res) => {
  const { recipe_id, name, description, price, category, available, cost_per_serving, profit_margin } = req.body;
  
  try {
    let query, values;
    
    if (recipe_id) {
      // Recipe-based menu item
      const recipeResult = await pool.query('SELECT name, description, category FROM recipes WHERE id = $1', [recipe_id]);
      if (recipeResult.rows.length === 0) {
        return res.status(400).json({ error: 'Recipe not found' });
      }
      
      const recipe = recipeResult.rows[0];
      query = `
        INSERT INTO menu_items (recipe_id, name, description, price, category, available, cost_per_serving, profit_margin) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `;
      values = [
        recipe_id,
        name || recipe.name,
        description || recipe.description,
        price,
        category || recipe.category,
        available !== undefined ? available : true,
        cost_per_serving || 0,
        profit_margin || 0.30
      ];
    } else {
      // Standalone menu item
      query = `
        INSERT INTO menu_items (name, description, price, category, available, cost_per_serving, profit_margin) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `;
      values = [name, description, price, category, available || true, cost_per_serving || 0, profit_margin || 0.30];
    }
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update menu item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { recipe_id, name, description, price, category, available, cost_per_serving, profit_margin } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE menu_items SET 
        recipe_id = $1, 
        name = $2, 
        description = $3, 
        price = $4, 
        category = $5, 
        available = $6,
        cost_per_serving = $7,
        profit_margin = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 RETURNING *`,
      [recipe_id, name, description, price, category, available, cost_per_serving, profit_margin, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
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

// Get available recipes for menu creation
router.get('/available-recipes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        CASE 
          WHEN mi.recipe_id IS NOT NULL THEN true 
          ELSE false 
        END as already_in_menu
      FROM recipes r
      LEFT JOIN menu_items mi ON r.id = mi.recipe_id
      ORDER BY r.category, r.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get menu item with full recipe details
router.get('/:id/recipe', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        mi.*,
        r.*,
        ri.name as ingredient_name,
        ri.quantity as ingredient_quantity,
        ri.unit as ingredient_unit,
        ri.notes as ingredient_notes,
        ri.order_index,
        rs.step_number,
        rs.instruction,
        rs.timing
      FROM menu_items mi
      LEFT JOIN recipes r ON mi.recipe_id = r.id
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id
      WHERE mi.id = $1
      ORDER BY ri.order_index, rs.step_number
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    // Process the data to structure ingredients and steps
    const menuItem = {
      ...result.rows[0],
      ingredients: [],
      steps: []
    };
    
    const ingredientsMap = new Map();
    const stepsMap = new Map();
    
    result.rows.forEach(row => {
      if (row.ingredient_name && !ingredientsMap.has(row.order_index)) {
        ingredientsMap.set(row.order_index, {
          name: row.ingredient_name,
          quantity: row.ingredient_quantity,
          unit: row.ingredient_unit,
          notes: row.ingredient_notes
        });
      }
      
      if (row.step_number && !stepsMap.has(row.step_number)) {
        stepsMap.set(row.step_number, {
          step_number: row.step_number,
          instruction: row.instruction,
          timing: row.timing
        });
      }
    });
    
    menuItem.ingredients = Array.from(ingredientsMap.values());
    menuItem.steps = Array.from(stepsMap.values());
    
    res.json(menuItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;