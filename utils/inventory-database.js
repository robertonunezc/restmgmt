/**
 * Inventory database utilities
 * Provides helper functions for inventory management operations
 */

import { DatabaseUtils } from './database.js';

/**
 * Product inventory database operations
 */
class ProductQueries {
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} - Created product with ID
   */
  static async createProduct(productData) {
    const query = `
      INSERT INTO products (name, description, unit_of_measure, current_quantity, 
                           low_stock_threshold, cost_per_unit, supplier_info)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      productData.name,
      productData.description || null,
      productData.unit_of_measure,
      productData.current_quantity || 0,
      productData.low_stock_threshold || 10,
      productData.cost_per_unit || null,
      productData.supplier_info || null
    ];
    
    const result = await DatabaseUtils.query(query, params);
    return result.rows[0];
  }

  /**
   * Get products with optional filtering and pagination
   * @param {Object} options - Query options (search, unit, page, limit)
   * @returns {Promise<Array>} - Array of products
   */
  static async getProducts(options = {}) {
    const { search, unit, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, 
             CASE 
               WHEN p.current_quantity = 0 THEN 'out_of_stock'
               WHEN p.current_quantity <= p.low_stock_threshold THEN 'low_stock'
               ELSE 'in_stock'
             END as stock_status
      FROM products p
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add unit filter
    if (unit) {
      query += ` AND p.unit_of_measure = $${paramIndex}`;
      params.push(unit);
      paramIndex++;
    }

    query += `
      ORDER BY p.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await DatabaseUtils.query(query, params);
    return result.rows;
  }

  /**
   * Get a single product by ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object|null>} - Product data or null if not found
   */
  static async getProductById(productId) {
    const query = `
      SELECT p.*, 
             CASE 
               WHEN p.current_quantity = 0 THEN 'out_of_stock'
               WHEN p.current_quantity <= p.low_stock_threshold THEN 'low_stock'
               ELSE 'in_stock'
             END as stock_status
      FROM products p
      WHERE p.id = $1
    `;
    
    const result = await DatabaseUtils.query(query, [productId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update a product
   * @param {number} productId - Product ID to update
   * @param {Object} productData - Updated product data
   * @returns {Promise<Object|null>} - Updated product or null if not found
   */
  static async updateProduct(productId, productData) {
    const query = `
      UPDATE products 
      SET name = $1, description = $2, unit_of_measure = $3, 
          low_stock_threshold = $4, cost_per_unit = $5, supplier_info = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const params = [
      productData.name,
      productData.description || null,
      productData.unit_of_measure,
      productData.low_stock_threshold || 10,
      productData.cost_per_unit || null,
      productData.supplier_info || null,
      productId
    ];
    
    const result = await DatabaseUtils.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Delete a product
   * @param {number} productId - Product ID to delete
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  static async deleteProduct(productId) {
    const query = 'DELETE FROM products WHERE id = $1';
    const result = await DatabaseUtils.query(query, [productId]);
    return result.rowCount > 0;
  }

  /**
   * Get total count of products with optional filtering
   * @param {Object} options - Query options (search, unit)
   * @returns {Promise<number>} - Total count
   */
  static async getProductCount(options = {}) {
    const { search, unit } = options;

    let query = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (unit) {
      query += ` AND unit_of_measure = $${paramIndex}`;
      params.push(unit);
    }

    const result = await DatabaseUtils.query(query, params);
    return parseInt(result.rows[0].total);
  }
}

/**
 * Inventory transaction database operations
 */
class InventoryTransactionQueries {
  /**
   * Create an inventory transaction and update product quantity
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Created transaction with updated product
   */
  static async createTransaction(transactionData) {
    return DatabaseUtils.transaction(async (client) => {
      // Insert transaction record
      const transactionQuery = `
        INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, 
                                          reference_type, reference_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const transactionParams = [
        transactionData.product_id,
        transactionData.transaction_type,
        transactionData.quantity_change,
        transactionData.reference_type || null,
        transactionData.reference_id || null,
        transactionData.notes || null
      ];
      
      const transactionResult = await client.query(transactionQuery, transactionParams);
      const transaction = transactionResult.rows[0];

      // Update product quantity
      const updateQuery = `
        UPDATE products 
        SET current_quantity = current_quantity + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [
        transactionData.quantity_change,
        transactionData.product_id
      ]);

      return {
        transaction: transaction,
        product: updateResult.rows[0]
      };
    });
  }

  /**
   * Get inventory transactions with optional filtering
   * @param {Object} options - Query options (product_id, transaction_type, page, limit)
   * @returns {Promise<Array>} - Array of transactions with product info
   */
  static async getTransactions(options = {}) {
    const { product_id, transaction_type, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT it.*, p.name as product_name, p.unit_of_measure
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (product_id) {
      query += ` AND it.product_id = $${paramIndex}`;
      params.push(product_id);
      paramIndex++;
    }

    if (transaction_type) {
      query += ` AND it.transaction_type = $${paramIndex}`;
      params.push(transaction_type);
      paramIndex++;
    }

    query += `
      ORDER BY it.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await DatabaseUtils.query(query, params);
    return result.rows;
  }

  /**
   * Adjust product quantity with transaction logging (restock operation)
   * @param {number} productId - Product ID
   * @param {number} quantityToAdd - Quantity to add (positive number)
   * @param {Object} options - Additional options (reference_type, reference_id, notes)
   * @returns {Promise<Object>} - Created transaction with updated product
   */
  static async restockProduct(productId, quantityToAdd, options = {}) {
    const transactionData = {
      product_id: productId,
      transaction_type: 'restock',
      quantity_change: Math.abs(quantityToAdd), // Ensure positive for restock
      reference_type: options.reference_type || 'manual',
      reference_id: options.reference_id || null,
      notes: options.notes || `Restock: +${Math.abs(quantityToAdd)} units`
    };

    return this.createTransaction(transactionData);
  }

  /**
   * Adjust product quantity with transaction logging (manual adjustment)
   * @param {number} productId - Product ID
   * @param {number} quantityChange - Quantity change (positive or negative)
   * @param {Object} options - Additional options (reference_type, reference_id, notes)
   * @returns {Promise<Object>} - Created transaction with updated product
   */
  static async adjustProductQuantity(productId, quantityChange, options = {}) {
    const transactionData = {
      product_id: productId,
      transaction_type: 'adjustment',
      quantity_change: quantityChange,
      reference_type: options.reference_type || 'manual',
      reference_id: options.reference_id || null,
      notes: options.notes || `Manual adjustment: ${quantityChange > 0 ? '+' : ''}${quantityChange} units`
    };

    return this.createTransaction(transactionData);
  }

  /**
   * Validate product exists before quantity operations
   * @param {number} productId - Product ID to validate
   * @returns {Promise<Object|null>} - Product data or null if not found
   */
  static async validateProductForQuantityUpdate(productId) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await DatabaseUtils.query(query, [productId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check if quantity adjustment would result in negative inventory
   * @param {number} productId - Product ID
   * @param {number} quantityChange - Proposed quantity change
   * @returns {Promise<Object>} - { isValid: boolean, currentQuantity: number, newQuantity: number }
   */
  static async validateQuantityChange(productId, quantityChange) {
    const product = await this.validateProductForQuantityUpdate(productId);
    
    if (!product) {
      return { isValid: false, error: 'Product not found' };
    }

    const newQuantity = parseFloat(product.current_quantity) + parseFloat(quantityChange);
    
    return {
      isValid: newQuantity >= 0,
      currentQuantity: parseFloat(product.current_quantity),
      newQuantity: newQuantity,
      error: newQuantity < 0 ? 'Quantity adjustment would result in negative inventory' : null
    };
  }

  /**
   * Process inventory updates for an order (batch operation)
   * @param {number} orderId - Order ID
   * @param {Array} orderItems - Array of order items with quantities
   * @returns {Promise<Array>} - Array of created transactions
   */
  static async processOrderInventoryUpdate(orderId, orderItems) {
    return DatabaseUtils.transaction(async (client) => {
      const transactions = [];

      for (const item of orderItems) {
        // Get recipe ingredient product links for this menu item
        const linksQuery = `
          SELECT rip.product_id, rip.quantity_per_serving, p.name as product_name
          FROM recipe_ingredient_products rip
          JOIN products p ON rip.product_id = p.id
          JOIN recipe_ingredients ri ON rip.recipe_ingredient_id = ri.id
          JOIN recipes r ON ri.recipe_id = r.id
          JOIN menu_items mi ON r.id = mi.recipe_id
          WHERE mi.id = $1
        `;
        
        const linksResult = await client.query(linksQuery, [item.menu_item_id]);
        
        // Process each linked product
        for (const link of linksResult.rows) {
          const quantityToDeduct = -(link.quantity_per_serving * item.quantity);
          
          // Create transaction
          const transactionQuery = `
            INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, 
                                              reference_type, reference_id, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const transactionParams = [
            link.product_id,
            'sale',
            quantityToDeduct,
            'order',
            orderId,
            `Order #${orderId} - ${link.product_name} usage`
          ];
          
          const transactionResult = await client.query(transactionQuery, transactionParams);
          transactions.push(transactionResult.rows[0]);

          // Update product quantity
          await client.query(`
            UPDATE products 
            SET current_quantity = current_quantity + $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [quantityToDeduct, link.product_id]);
        }
      }

      return transactions;
    });
  }
}

/**
 * Recipe ingredient product link database operations
 */
class RecipeIngredientProductQueries {
  /**
   * Create a link between recipe ingredient and product
   * @param {Object} linkData - Link data
   * @returns {Promise<Object>} - Created link
   */
  static async createLink(linkData) {
    const query = `
      INSERT INTO recipe_ingredient_products (recipe_ingredient_id, product_id, quantity_per_serving)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const params = [
      linkData.recipe_ingredient_id,
      linkData.product_id,
      linkData.quantity_per_serving
    ];
    
    const result = await DatabaseUtils.query(query, params);
    return result.rows[0];
  }

  /**
   * Get product links for a recipe
   * @param {number} recipeId - Recipe ID
   * @returns {Promise<Array>} - Array of links with product and ingredient info
   */
  static async getRecipeProductLinks(recipeId) {
    const query = `
      SELECT rip.*, ri.name as ingredient_name, ri.unit as ingredient_unit,
             p.name as product_name, p.unit_of_measure, p.current_quantity
      FROM recipe_ingredient_products rip
      JOIN recipe_ingredients ri ON rip.recipe_ingredient_id = ri.id
      JOIN products p ON rip.product_id = p.id
      WHERE ri.recipe_id = $1
      ORDER BY ri.order_index
    `;
    
    const result = await DatabaseUtils.query(query, [recipeId]);
    return result.rows;
  }

  /**
   * Delete a recipe ingredient product link
   * @param {number} linkId - Link ID to delete
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  static async deleteLink(linkId) {
    const query = 'DELETE FROM recipe_ingredient_products WHERE id = $1';
    const result = await DatabaseUtils.query(query, [linkId]);
    return result.rowCount > 0;
  }

  /**
   * Validate that a recipe ingredient exists
   * @param {number} recipeIngredientId - Recipe ingredient ID to validate
   * @returns {Promise<boolean>} - True if exists, false otherwise
   */
  static async validateRecipeIngredientExists(recipeIngredientId) {
    const query = 'SELECT id FROM recipe_ingredients WHERE id = $1';
    const result = await DatabaseUtils.query(query, [recipeIngredientId]);
    return result.rows.length > 0;
  }

  /**
   * Validate that a product exists
   * @param {number} productId - Product ID to validate
   * @returns {Promise<boolean>} - True if exists, false otherwise
   */
  static async validateProductExists(productId) {
    const query = 'SELECT id FROM products WHERE id = $1';
    const result = await DatabaseUtils.query(query, [productId]);
    return result.rows.length > 0;
  }

  /**
   * Validate that both recipe ingredient and product exist
   * @param {number} recipeIngredientId - Recipe ingredient ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} - { isValid: boolean, errors: Array }
   */
  static async validateRecipeIngredientAndProduct(recipeIngredientId, productId) {
    const errors = [];

    const [ingredientExists, productExists] = await Promise.all([
      this.validateRecipeIngredientExists(recipeIngredientId),
      this.validateProductExists(productId)
    ]);

    if (!ingredientExists) {
      errors.push({ 
        field: 'recipe_ingredient_id', 
        message: `Recipe ingredient with ID ${recipeIngredientId} does not exist` 
      });
    }

    if (!productExists) {
      errors.push({ 
        field: 'product_id', 
        message: `Product with ID ${productId} does not exist` 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a link already exists between recipe ingredient and product
   * @param {number} recipeIngredientId - Recipe ingredient ID
   * @param {number} productId - Product ID
   * @returns {Promise<boolean>} - True if link exists, false otherwise
   */
  static async linkExists(recipeIngredientId, productId) {
    const query = `
      SELECT id FROM recipe_ingredient_products 
      WHERE recipe_ingredient_id = $1 AND product_id = $2
    `;
    const result = await DatabaseUtils.query(query, [recipeIngredientId, productId]);
    return result.rows.length > 0;
  }

  /**
   * Create a link with full validation
   * @param {Object} linkData - Link data
   * @returns {Promise<Object>} - Created link or validation errors
   */
  static async createLinkWithValidation(linkData) {
    // First validate the link data structure
    const { RecipeIngredientProductLink } = await import('../models/RecipeIngredientProductLink.js');
    const link = new RecipeIngredientProductLink(linkData);
    const validationResult = link.validateForCreation();
    
    if (!validationResult.isValid) {
      return { success: false, errors: validationResult.errors };
    }

    // Validate that recipe ingredient and product exist
    const existenceValidation = await this.validateRecipeIngredientAndProduct(
      linkData.recipe_ingredient_id, 
      linkData.product_id
    );
    
    if (!existenceValidation.isValid) {
      return { success: false, errors: existenceValidation.errors };
    }

    // Check if link already exists
    const exists = await this.linkExists(linkData.recipe_ingredient_id, linkData.product_id);
    if (exists) {
      return { 
        success: false, 
        errors: [{ 
          field: 'recipe_ingredient_id', 
          message: 'Link between this recipe ingredient and product already exists' 
        }] 
      };
    }

    // Create the link
    try {
      const createdLink = await this.createLink(linkData);
      return { success: true, data: createdLink };
    } catch (error) {
      return { 
        success: false, 
        errors: [{ field: 'database', message: error.message }] 
      };
    }
  }
}

/**
 * Alert and dashboard query operations
 */
class AlertQueries {
  /**
   * Get products with low stock
   * @returns {Promise<Array>} - Array of low stock products
   */
  static async getLowStockProducts() {
    const query = `
      SELECT * FROM products 
      WHERE current_quantity > 0 AND current_quantity <= low_stock_threshold
      ORDER BY current_quantity ASC, name
    `;
    
    const result = await DatabaseUtils.query(query);
    return result.rows;
  }

  /**
   * Get products that are out of stock
   * @returns {Promise<Array>} - Array of out of stock products
   */
  static async getOutOfStockProducts() {
    const query = `
      SELECT * FROM products 
      WHERE current_quantity = 0
      ORDER BY name
    `;
    
    const result = await DatabaseUtils.query(query);
    return result.rows;
  }

  /**
   * Get dashboard summary data
   * @returns {Promise<Object>} - Dashboard summary statistics
   */
  static async getDashboardSummary() {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN current_quantity = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN current_quantity > 0 AND current_quantity <= low_stock_threshold THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN current_quantity > low_stock_threshold THEN 1 END) as in_stock_count,
        SUM(current_quantity * cost_per_unit) as total_inventory_value
      FROM products
    `;
    
    const result = await DatabaseUtils.query(query);
    return result.rows[0];
  }
}

export {
  ProductQueries,
  InventoryTransactionQueries,
  RecipeIngredientProductQueries,
  AlertQueries
};