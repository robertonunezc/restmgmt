/**
 * Database query utilities for product inventory management
 * Provides helper functions for product CRUD operations with transaction support
 * Requirements: 1.1, 1.3
 */

const { DatabaseUtils } = require('./database');
const { Product } = require('../models/Product');

/**
 * Product-specific database operations
 */
class ProductQueries {
  /**
   * Create a new product
   * @param {Object} productData - Product data to create
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
      productData.current_quantity,
      productData.low_stock_threshold || 10,
      productData.cost_per_unit || null,
      productData.supplier_info || null
    ];

    const result = await DatabaseUtils.query(query, params);
    return new Product(result.rows[0]);
  }

  /**
   * Get products with optional filtering and pagination
   * @param {Object} options - Query options (search, unit, page, limit, sortBy, sortOrder)
   * @returns {Promise<Array>} - Array of products
   */
  static async getProducts(options = {}) {
    const { 
      search, 
      unit, 
      lowStock = false,
      outOfStock = false,
      page = 1, 
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = options;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM products 
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Add search filter (name or description)
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add unit filter
    if (unit) {
      query += ` AND unit_of_measure = $${paramIndex}`;
      params.push(unit);
      paramIndex++;
    }

    // Add low stock filter
    if (lowStock) {
      query += ` AND current_quantity <= low_stock_threshold AND current_quantity > 0`;
    }

    // Add out of stock filter
    if (outOfStock) {
      query += ` AND current_quantity = 0`;
    }

    // Add sorting
    const validSortColumns = ['name', 'current_quantity', 'low_stock_threshold', 'cost_per_unit', 'created_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';
    
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await DatabaseUtils.query(query, params);
    return result.rows.map(row => new Product(row));
  }

  /**
   * Get a single product by ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object|null>} - Product data or null if not found
   */
  static async getProductById(productId) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await DatabaseUtils.query(query, [productId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Product(result.rows[0]);
  }

  /**
   * Get a product by name (for uniqueness checking)
   * @param {string} name - Product name
   * @param {number} excludeId - Product ID to exclude (for updates)
   * @returns {Promise<Object|null>} - Product data or null if not found
   */
  static async getProductByName(name, excludeId = null) {
    let query = 'SELECT * FROM products WHERE name = $1';
    const params = [name];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await DatabaseUtils.query(query, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Product(result.rows[0]);
  }

  /**
   * Update a product
   * @param {number} productId - Product ID to update
   * @param {Object} productData - Updated product data
   * @returns {Promise<Object|null>} - Updated product or null if not found
   */
  static async updateProduct(productId, productData) {
    // Check if product exists
    const existsResult = await DatabaseUtils.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (existsResult.rows.length === 0) {
      return null;
    }

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (productData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      params.push(productData.name);
      paramIndex++;
    }

    if (productData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(productData.description);
      paramIndex++;
    }

    if (productData.unit_of_measure !== undefined) {
      updateFields.push(`unit_of_measure = $${paramIndex}`);
      params.push(productData.unit_of_measure);
      paramIndex++;
    }

    if (productData.current_quantity !== undefined) {
      updateFields.push(`current_quantity = $${paramIndex}`);
      params.push(productData.current_quantity);
      paramIndex++;
    }

    if (productData.low_stock_threshold !== undefined) {
      updateFields.push(`low_stock_threshold = $${paramIndex}`);
      params.push(productData.low_stock_threshold);
      paramIndex++;
    }

    if (productData.cost_per_unit !== undefined) {
      updateFields.push(`cost_per_unit = $${paramIndex}`);
      params.push(productData.cost_per_unit);
      paramIndex++;
    }

    if (productData.supplier_info !== undefined) {
      updateFields.push(`supplier_info = $${paramIndex}`);
      params.push(productData.supplier_info);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 1) { // Only updated_at was added
      // No actual fields to update
      return await this.getProductById(productId);
    }

    const query = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    params.push(productId);

    const result = await DatabaseUtils.query(query, params);
    return new Product(result.rows[0]);
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
   * @param {Object} options - Query options (search, unit, lowStock, outOfStock)
   * @returns {Promise<number>} - Total count
   */
  static async getProductCount(options = {}) {
    const { search, unit, lowStock = false, outOfStock = false } = options;

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
      paramIndex++;
    }

    if (lowStock) {
      query += ` AND current_quantity <= low_stock_threshold AND current_quantity > 0`;
    }

    if (outOfStock) {
      query += ` AND current_quantity = 0`;
    }

    const result = await DatabaseUtils.query(query, params);
    return parseInt(result.rows[0].total);
  }

  /**
   * Get products with low stock (quantity <= threshold and > 0)
   * @returns {Promise<Array>} - Array of low stock products
   */
  static async getLowStockProducts() {
    const query = `
      SELECT * FROM products 
      WHERE current_quantity <= low_stock_threshold AND current_quantity > 0
      ORDER BY current_quantity ASC, name ASC
    `;
    
    const result = await DatabaseUtils.query(query);
    return result.rows.map(row => new Product(row));
  }

  /**
   * Get products that are out of stock (quantity = 0)
   * @returns {Promise<Array>} - Array of out of stock products
   */
  static async getOutOfStockProducts() {
    const query = `
      SELECT * FROM products 
      WHERE current_quantity = 0
      ORDER BY name ASC
    `;
    
    const result = await DatabaseUtils.query(query);
    return result.rows.map(row => new Product(row));
  }

  /**
   * Get unique units of measure used in products
   * @returns {Promise<Array>} - Array of unit strings
   */
  static async getUsedUnits() {
    const query = `
      SELECT DISTINCT unit_of_measure 
      FROM products 
      ORDER BY unit_of_measure ASC
    `;
    
    const result = await DatabaseUtils.query(query);
    return result.rows.map(row => row.unit_of_measure);
  }
}

module.exports = { ProductQueries };