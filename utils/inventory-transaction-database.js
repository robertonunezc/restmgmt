const { pool } = require('./db-connection');
const InventoryTransaction = require('../models/InventoryTransaction');

class InventoryTransactionDatabase {
  /**
   * Log an inventory transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<InventoryTransaction>} Created transaction
   */
  static async logTransaction(transactionData) {
    const transaction = new InventoryTransaction(transactionData);
    
    // Validate transaction data
    const validationErrors = transaction.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const query = `
      INSERT INTO inventory_transactions 
      (product_id, transaction_type, quantity_change, reference_type, reference_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      transaction.product_id,
      transaction.transaction_type,
      transaction.quantity_change,
      transaction.reference_type,
      transaction.reference_id,
      transaction.notes
    ];

    try {
      const result = await pool.query(query, values);
      return new InventoryTransaction(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to log inventory transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction history for a product
   * @param {number} productId - Product ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array<InventoryTransaction>>} Transaction history
   */
  static async getProductTransactionHistory(productId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const query = `
      SELECT * FROM inventory_transactions 
      WHERE product_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await pool.query(query, [productId, limit, offset]);
      return result.rows.map(row => new InventoryTransaction(row));
    } catch (error) {
      throw new Error(`Failed to get product transaction history: ${error.message}`);
    }
  }

  /**
   * Get all transaction history with optional filtering
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array<InventoryTransaction>>} Transaction history
   */
  static async getTransactionHistory(filters = {}, options = {}) {
    const { limit = 100, offset = 0 } = options;
    const { transaction_type, reference_type, product_id, start_date, end_date } = filters;

    let query = 'SELECT * FROM inventory_transactions WHERE 1=1';
    const values = [];
    let paramCount = 0;

    // Add filters
    if (product_id) {
      paramCount++;
      query += ` AND product_id = $${paramCount}`;
      values.push(product_id);
    }

    if (transaction_type) {
      paramCount++;
      query += ` AND transaction_type = $${paramCount}`;
      values.push(transaction_type);
    }

    if (reference_type) {
      paramCount++;
      query += ` AND reference_type = $${paramCount}`;
      values.push(reference_type);
    }

    if (start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(end_date);
    }

    // Add ordering and pagination
    query += ' ORDER BY created_at DESC';
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => new InventoryTransaction(row));
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Get transaction by ID
   * @param {number} transactionId - Transaction ID
   * @returns {Promise<InventoryTransaction|null>} Transaction or null if not found
   */
  static async getTransactionById(transactionId) {
    const query = 'SELECT * FROM inventory_transactions WHERE id = $1';

    try {
      const result = await pool.query(query, [transactionId]);
      return result.rows.length > 0 ? new InventoryTransaction(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to get transaction by ID: ${error.message}`);
    }
  }

  /**
   * Get transaction count for filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total count
   */
  static async getTransactionCount(filters = {}) {
    const { transaction_type, reference_type, product_id, start_date, end_date } = filters;

    let query = 'SELECT COUNT(*) FROM inventory_transactions WHERE 1=1';
    const values = [];
    let paramCount = 0;

    // Add same filters as getTransactionHistory
    if (product_id) {
      paramCount++;
      query += ` AND product_id = $${paramCount}`;
      values.push(product_id);
    }

    if (transaction_type) {
      paramCount++;
      query += ` AND transaction_type = $${paramCount}`;
      values.push(transaction_type);
    }

    if (reference_type) {
      paramCount++;
      query += ` AND reference_type = $${paramCount}`;
      values.push(reference_type);
    }

    if (start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(end_date);
    }

    try {
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Failed to get transaction count: ${error.message}`);
    }
  }
}

module.exports = InventoryTransactionDatabase;