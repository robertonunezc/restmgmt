const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const { pool } = require('./utils/db-connection');

// Error handling middleware
const {
  jsonErrorHandler,
  databaseErrorHandler,
  validationErrorHandler,
  authErrorHandler,
  globalErrorHandler,
  notFoundHandler
} = require('./middleware/errorHandler');

// Routes
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/database', require('./routes/database'));
app.use('/api/inventory', require('./routes/inventory'));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test database connection and recipe table connectivity
app.get('/api/health', async (req, res) => {
  try {
    // Test basic database connection
    const timeResult = await pool.query('SELECT NOW()');
    
    // Test recipe table connectivity
    const recipeResult = await pool.query('SELECT COUNT(*) as recipe_count FROM recipes');
    const ingredientResult = await pool.query('SELECT COUNT(*) as ingredient_count FROM recipe_ingredients');
    const stepResult = await pool.query('SELECT COUNT(*) as step_count FROM recipe_steps');
    
    res.json({ 
      status: 'healthy', 
      db_time: timeResult.rows[0].now,
      recipe_tables: {
        recipes: parseInt(recipeResult.rows[0].recipe_count),
        ingredients: parseInt(ingredientResult.rows[0].ingredient_count),
        steps: parseInt(stepResult.rows[0].step_count)
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Error handling middleware (must be after routes)
app.use(jsonErrorHandler);
app.use(databaseErrorHandler);
app.use(validationErrorHandler);
app.use(authErrorHandler);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Restaurant server running on port ${PORT}`);
});

module.exports = { app, pool };