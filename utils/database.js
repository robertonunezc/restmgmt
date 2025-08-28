/**
 * Database query utilities for recipe management
 * Provides helper functions for recipe CRUD operations with transaction support
 */

const { pool } = require('./db-connection');

/**
 * Database connection and query helper functions
 */
class DatabaseUtils {
  /**
   * Execute a query with parameters
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Query result
   */
  static async query(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  /**
   * Get a database client for transactions
   * @returns {Promise<Object>} - Database client
   */
  static async getClient() {
    try {
      return await pool.connect();
    } catch (error) {
      throw new Error(`Failed to get database client: ${error.message}`);
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Function that receives client and executes queries
   * @returns {Promise<any>} - Result from callback
   */
  static async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Recipe-specific database operations
 */
class RecipeQueries {
  /**
   * Create a new recipe with ingredients and steps
   * @param {Object} recipeData - Complete recipe data
   * @returns {Promise<Object>} - Created recipe with ID
   */
  static async createRecipe(recipeData) {
    return DatabaseUtils.transaction(async (client) => {
      // Insert main recipe
      const recipeQuery = `
        INSERT INTO recipes (name, description, category, prep_time, cook_time, servings, difficulty)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const recipeParams = [
        recipeData.name,
        recipeData.description || null,
        recipeData.category,
        recipeData.prep_time || null,
        recipeData.cook_time || null,
        recipeData.servings || null,
        recipeData.difficulty || null
      ];
      
      const recipeResult = await client.query(recipeQuery, recipeParams);
      const recipe = recipeResult.rows[0];

      // Insert ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        for (let i = 0; i < recipeData.ingredients.length; i++) {
          const ingredient = recipeData.ingredients[i];
          const ingredientQuery = `
            INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, notes, order_index)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          const ingredientParams = [
            recipe.id,
            ingredient.product_id,
            ingredient.quantity || null,
            ingredient.unit || null,
            ingredient.notes || null,
            ingredient.order_index || i + 1
          ];
          await client.query(ingredientQuery, ingredientParams);
        }
      }

      // Insert steps
      if (recipeData.steps && recipeData.steps.length > 0) {
        for (let i = 0; i < recipeData.steps.length; i++) {
          const step = recipeData.steps[i];
          const stepQuery = `
            INSERT INTO recipe_steps (recipe_id, step_number, instruction, timing)
            VALUES ($1, $2, $3, $4)
          `;
          const stepParams = [
            recipe.id,
            step.step_number || (i + 1), // Auto-assign step number if not provided
            step.instruction,
            step.timing || null
          ];
          await client.query(stepQuery, stepParams);
        }
      }

      return recipe;
    });
  }

  /**
   * Get recipes with optional filtering and pagination
   * @param {Object} options - Query options (category, search, page, limit)
   * @returns {Promise<Array>} - Array of recipes with basic info
   */
  static async getRecipes(options = {}) {
    const { category, search, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, 
             COUNT(DISTINCT ri.id) as ingredient_count,
             COUNT(DISTINCT rs.id) as step_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Add category filter
    if (category) {
      query += ` AND r.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      query += ` AND r.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY r.id
      ORDER BY r.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await DatabaseUtils.query(query, params);
    return result.rows;
  }

  /**
   * Get a single recipe with full details (ingredients and steps)
   * @param {number} recipeId - Recipe ID
   * @returns {Promise<Object|null>} - Complete recipe data or null if not found
   */
  static async getRecipeById(recipeId) {
    // Get main recipe data
    const recipeQuery = 'SELECT * FROM recipes WHERE id = $1';
    const recipeResult = await DatabaseUtils.query(recipeQuery, [recipeId]);
    
    if (recipeResult.rows.length === 0) {
      return null;
    }

    const recipe = recipeResult.rows[0];

    // Get ingredients with product information
    const ingredientsQuery = `
      SELECT ri.*, p.name as product_name, p.unit_of_measure as product_unit, 
             p.current_quantity as product_stock, p.low_stock_threshold
      FROM recipe_ingredients ri
      JOIN products p ON ri.product_id = p.id
      WHERE ri.recipe_id = $1 
      ORDER BY ri.order_index, ri.id
    `;
    const ingredientsResult = await DatabaseUtils.query(ingredientsQuery, [recipeId]);
    recipe.ingredients = ingredientsResult.rows;

    // Get steps
    const stepsQuery = `
      SELECT * FROM recipe_steps 
      WHERE recipe_id = $1 
      ORDER BY step_number
    `;
    const stepsResult = await DatabaseUtils.query(stepsQuery, [recipeId]);
    recipe.steps = stepsResult.rows;

    return recipe;
  }

  /**
   * Update a recipe with ingredients and steps
   * @param {number} recipeId - Recipe ID to update
   * @param {Object} recipeData - Updated recipe data
   * @returns {Promise<Object|null>} - Updated recipe or null if not found
   */
  static async updateRecipe(recipeId, recipeData) {
    return DatabaseUtils.transaction(async (client) => {
      // Check if recipe exists
      const existsResult = await client.query('SELECT id FROM recipes WHERE id = $1', [recipeId]);
      if (existsResult.rows.length === 0) {
        return null;
      }

      // Update main recipe
      const recipeQuery = `
        UPDATE recipes 
        SET name = $1, description = $2, category = $3, prep_time = $4, 
            cook_time = $5, servings = $6, difficulty = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;
      const recipeParams = [
        recipeData.name,
        recipeData.description || null,
        recipeData.category,
        recipeData.prep_time || null,
        recipeData.cook_time || null,
        recipeData.servings || null,
        recipeData.difficulty || null,
        recipeId
      ];
      
      const recipeResult = await client.query(recipeQuery, recipeParams);
      const recipe = recipeResult.rows[0];

      // Delete existing ingredients and steps
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
      await client.query('DELETE FROM recipe_steps WHERE recipe_id = $1', [recipeId]);

      // Insert new ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        for (let i = 0; i < recipeData.ingredients.length; i++) {
          const ingredient = recipeData.ingredients[i];
          const ingredientQuery = `
            INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, notes, order_index)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          const ingredientParams = [
            recipeId,
            ingredient.product_id,
            ingredient.quantity || null,
            ingredient.unit || null,
            ingredient.notes || null,
            ingredient.order_index || i + 1
          ];
          await client.query(ingredientQuery, ingredientParams);
        }
      }

      // Insert new steps
      if (recipeData.steps && recipeData.steps.length > 0) {
        for (const step of recipeData.steps) {
          const stepQuery = `
            INSERT INTO recipe_steps (recipe_id, step_number, instruction, timing)
            VALUES ($1, $2, $3, $4)
          `;
          const stepParams = [
            recipeId,
            step.step_number,
            step.instruction,
            step.timing || null
          ];
          await client.query(stepQuery, stepParams);
        }
      }

      return recipe;
    });
  }

  /**
   * Delete a recipe and all associated data
   * @param {number} recipeId - Recipe ID to delete
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  static async deleteRecipe(recipeId) {
    const query = 'DELETE FROM recipes WHERE id = $1';
    const result = await DatabaseUtils.query(query, [recipeId]);
    return result.rowCount > 0;
  }

  /**
   * Get total count of recipes with optional filtering
   * @param {Object} options - Query options (category, search)
   * @returns {Promise<number>} - Total count
   */
  static async getRecipeCount(options = {}) {
    const { category, search } = options;

    let query = 'SELECT COUNT(*) as total FROM recipes WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
    }

    const result = await DatabaseUtils.query(query, params);
    return parseInt(result.rows[0].total);
  }
}

module.exports = {
  DatabaseUtils,
  RecipeQueries
};