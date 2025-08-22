import { describe, it, expect, beforeEach, vi } from 'vitest';
const InventoryTransactionDatabase = require('../utils/inventory-transaction-database');
const InventoryTransaction = require('../models/InventoryTransaction');
const { pool } = require('../utils/db-connection');

// Mock the database connection
vi.mock('../utils/db-connection', () => ({
  pool: {
    query: vi.fn()
  }
}));

describe('InventoryTransactionDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logTransaction', () => {
    it('should log a valid transaction', async () => {
      const transactionData = {
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        reference_type: 'manual',
        reference_id: 123,
        notes: 'Test restock'
      };

      const mockResult = {
        rows: [{
          id: 1,
          ...transactionData,
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const result = await InventoryTransactionDatabase.logTransaction(transactionData);

      expect(result).toBeInstanceOf(InventoryTransaction);
      expect(result.id).toBe(1);
      expect(result.product_id).toBe(1);
      expect(result.transaction_type).toBe('restock');
      expect(result.quantity_change).toBe(10.5);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inventory_transactions'),
        [1, 'restock', 10.5, 'manual', 123, 'Test restock']
      );
    });

    it('should throw error for invalid transaction data', async () => {
      const invalidData = {
        product_id: -1, // Invalid
        transaction_type: 'restock',
        quantity_change: 10.5
      };

      await expect(InventoryTransactionDatabase.logTransaction(invalidData))
        .rejects.toThrow('Validation failed');

      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const transactionData = {
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5
      };

      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(InventoryTransactionDatabase.logTransaction(transactionData))
        .rejects.toThrow('Failed to log inventory transaction: Database error');
    });
  });

  describe('getProductTransactionHistory', () => {
    it('should get transaction history for a product', async () => {
      const mockTransactions = [
        {
          id: 1,
          product_id: 1,
          transaction_type: 'restock',
          quantity_change: 10.5,
          created_at: new Date()
        },
        {
          id: 2,
          product_id: 1,
          transaction_type: 'sale',
          quantity_change: -2.5,
          created_at: new Date()
        }
      ];

      pool.query.mockResolvedValue({ rows: mockTransactions });

      const result = await InventoryTransactionDatabase.getProductTransactionHistory(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(InventoryTransaction);
      expect(result[1]).toBeInstanceOf(InventoryTransaction);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1'),
        [1, 50, 0]
      );
    });

    it('should use custom limit and offset', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await InventoryTransactionDatabase.getProductTransactionHistory(1, { limit: 10, offset: 20 });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [1, 10, 20]
      );
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(InventoryTransactionDatabase.getProductTransactionHistory(1))
        .rejects.toThrow('Failed to get product transaction history: Database error');
    });
  });

  describe('getTransactionHistory', () => {
    it('should get all transaction history without filters', async () => {
      const mockTransactions = [
        {
          id: 1,
          product_id: 1,
          transaction_type: 'restock',
          quantity_change: 10.5,
          created_at: new Date()
        }
      ];

      pool.query.mockResolvedValue({ rows: mockTransactions });

      const result = await InventoryTransactionDatabase.getTransactionHistory();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(InventoryTransaction);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        [100, 0]
      );
    });

    it('should apply filters correctly', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const filters = {
        product_id: 1,
        transaction_type: 'restock',
        reference_type: 'manual',
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };

      await InventoryTransactionDatabase.getTransactionHistory(filters, { limit: 25, offset: 10 });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/product_id = \$1.*transaction_type = \$2.*reference_type = \$3.*created_at >= \$4.*created_at <= \$5/),
        [1, 'restock', 'manual', '2023-01-01', '2023-12-31', 25, 10]
      );
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(InventoryTransactionDatabase.getTransactionHistory())
        .rejects.toThrow('Failed to get transaction history: Database error');
    });
  });

  describe('getTransactionById', () => {
    it('should get transaction by ID', async () => {
      const mockTransaction = {
        id: 1,
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        created_at: new Date()
      };

      pool.query.mockResolvedValue({ rows: [mockTransaction] });

      const result = await InventoryTransactionDatabase.getTransactionById(1);

      expect(result).toBeInstanceOf(InventoryTransaction);
      expect(result.id).toBe(1);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM inventory_transactions WHERE id = $1',
        [1]
      );
    });

    it('should return null when transaction not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await InventoryTransactionDatabase.getTransactionById(999);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(InventoryTransactionDatabase.getTransactionById(1))
        .rejects.toThrow('Failed to get transaction by ID: Database error');
    });
  });

  describe('getTransactionCount', () => {
    it('should get transaction count without filters', async () => {
      pool.query.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await InventoryTransactionDatabase.getTransactionCount();

      expect(result).toBe(42);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        []
      );
    });

    it('should apply filters to count query', async () => {
      pool.query.mockResolvedValue({ rows: [{ count: '10' }] });

      const filters = {
        product_id: 1,
        transaction_type: 'restock'
      };

      const result = await InventoryTransactionDatabase.getTransactionCount(filters);

      expect(result).toBe(10);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/COUNT.*product_id = \$1.*transaction_type = \$2/),
        [1, 'restock']
      );
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(InventoryTransactionDatabase.getTransactionCount())
        .rejects.toThrow('Failed to get transaction count: Database error');
    });
  });
});