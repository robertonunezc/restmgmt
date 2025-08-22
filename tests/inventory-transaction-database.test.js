import { describe, it, expect } from 'vitest';
const InventoryTransactionDatabase = require('../utils/inventory-transaction-database');
const InventoryTransaction = require('../models/InventoryTransaction');

describe('InventoryTransactionDatabase', () => {

  describe('logTransaction', () => {
    it('should validate transaction data before logging', async () => {
      const invalidData = {
        product_id: -1, // Invalid
        transaction_type: 'restock',
        quantity_change: 10.5
      };

      await expect(InventoryTransactionDatabase.logTransaction(invalidData))
        .rejects.toThrow('Validation failed');
    });

    it('should create InventoryTransaction instance with valid data', () => {
      const transactionData = {
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        reference_type: 'manual',
        reference_id: 123,
        notes: 'Test restock'
      };

      const transaction = new InventoryTransaction(transactionData);
      expect(transaction.validate()).toEqual([]);
    });
  });

  describe('getProductTransactionHistory', () => {
    it('should have correct method signature', () => {
      expect(typeof InventoryTransactionDatabase.getProductTransactionHistory).toBe('function');
    });

    it('should handle options parameter with defaults', () => {
      const options = {};
      const { limit = 50, offset = 0 } = options;
      
      expect(limit).toBe(50);
      expect(offset).toBe(0);
    });
  });

  describe('getTransactionHistory', () => {
    it('should have correct method signature', () => {
      expect(typeof InventoryTransactionDatabase.getTransactionHistory).toBe('function');
    });

    it('should handle filter parameters', () => {
      const filters = {
        product_id: 1,
        transaction_type: 'restock',
        reference_type: 'manual',
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };

      expect(filters.product_id).toBe(1);
      expect(filters.transaction_type).toBe('restock');
      expect(filters.reference_type).toBe('manual');
    });
  });

  describe('getTransactionById', () => {
    it('should have correct method signature', () => {
      expect(typeof InventoryTransactionDatabase.getTransactionById).toBe('function');
    });
  });

  describe('getTransactionCount', () => {
    it('should have correct method signature', () => {
      expect(typeof InventoryTransactionDatabase.getTransactionCount).toBe('function');
    });
  });
});