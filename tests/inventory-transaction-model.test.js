import { describe, it, expect } from 'vitest';
const InventoryTransaction = require('../models/InventoryTransaction');

describe('InventoryTransaction Model', () => {
  describe('constructor', () => {
    it('should create an InventoryTransaction instance with valid data', () => {
      const data = {
        id: 1,
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        reference_type: 'manual',
        reference_id: 123,
        notes: 'Test restock',
        created_at: new Date()
      };

      const transaction = new InventoryTransaction(data);

      expect(transaction.id).toBe(1);
      expect(transaction.product_id).toBe(1);
      expect(transaction.transaction_type).toBe('restock');
      expect(transaction.quantity_change).toBe(10.5);
      expect(transaction.reference_type).toBe('manual');
      expect(transaction.reference_id).toBe(123);
      expect(transaction.notes).toBe('Test restock');
      expect(transaction.created_at).toBe(data.created_at);
    });
  });

  describe('validation', () => {
    it('should validate a complete valid transaction', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        reference_type: 'manual',
        reference_id: 123,
        notes: 'Test restock'
      });

      const errors = transaction.validate();
      expect(errors).toEqual([]);
      expect(transaction.isValid()).toBe(true);
    });

    it('should require product_id', () => {
      const transaction = new InventoryTransaction({
        transaction_type: 'restock',
        quantity_change: 10.5
      });

      const errors = transaction.validate();
      expect(errors).toContain('Product ID is required');
      expect(transaction.isValid()).toBe(false);
    });

    it('should require transaction_type', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        quantity_change: 10.5
      });

      const errors = transaction.validate();
      expect(errors).toContain('Transaction type is required');
      expect(transaction.isValid()).toBe(false);
    });

    it('should require quantity_change', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'restock'
      });

      const errors = transaction.validate();
      expect(errors).toContain('Quantity change is required');
      expect(transaction.isValid()).toBe(false);
    });

    it('should validate product_id is a positive integer', () => {
      const transaction = new InventoryTransaction({
        product_id: -1,
        transaction_type: 'restock',
        quantity_change: 10.5
      });

      const errors = transaction.validate();
      expect(errors).toContain('Product ID must be a positive integer');
    });

    it('should validate transaction_type is from allowed values', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'invalid_type',
        quantity_change: 10.5
      });

      const errors = transaction.validate();
      expect(errors).toContain('Transaction type must be one of: sale, restock, adjustment, waste');
    });

    it('should allow all valid transaction types', () => {
      const validTypes = ['sale', 'restock', 'adjustment', 'waste'];
      
      validTypes.forEach(type => {
        const transaction = new InventoryTransaction({
          product_id: 1,
          transaction_type: type,
          quantity_change: 10.5
        });

        expect(transaction.validate()).toEqual([]);
      });
    });

    it('should validate quantity_change is a number', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 'not_a_number'
      });

      const errors = transaction.validate();
      expect(errors).toContain('Quantity change must be a valid number');
    });

    it('should allow negative quantity_change', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'sale',
        quantity_change: -5.5
      });

      const errors = transaction.validate();
      expect(errors).toEqual([]);
    });

    it('should validate reference_type is from allowed values when provided', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        reference_type: 'invalid_ref_type'
      });

      const errors = transaction.validate();
      expect(errors).toContain('Reference type must be one of: order, manual, recipe');
    });

    it('should allow all valid reference types', () => {
      const validRefTypes = ['order', 'manual', 'recipe'];
      
      validRefTypes.forEach(refType => {
        const transaction = new InventoryTransaction({
          product_id: 1,
          transaction_type: 'restock',
          quantity_change: 10.5,
          reference_type: refType,
          reference_id: 123
        });

        expect(transaction.validate()).toEqual([]);
      });
    });

    it('should validate reference_id when reference_type is provided', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        reference_type: 'manual',
        reference_id: -1
      });

      const errors = transaction.validate();
      expect(errors).toContain('Reference ID must be a positive integer when reference type is provided');
    });

    it('should validate notes length', () => {
      const longNotes = 'a'.repeat(1001);
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        notes: longNotes
      });

      const errors = transaction.validate();
      expect(errors).toContain('Notes must be a string with maximum 1000 characters');
    });

    it('should allow valid notes', () => {
      const transaction = new InventoryTransaction({
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        notes: 'Valid notes within limit'
      });

      const errors = transaction.validate();
      expect(errors).toEqual([]);
    });
  });

  describe('toJSON', () => {
    it('should return a JSON representation of the transaction', () => {
      const data = {
        id: 1,
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.5,
        reference_type: 'manual',
        reference_id: 123,
        notes: 'Test restock',
        created_at: new Date()
      };

      const transaction = new InventoryTransaction(data);
      const json = transaction.toJSON();

      expect(json).toEqual(data);
    });
  });

  describe('constants', () => {
    it('should have correct TRANSACTION_TYPES', () => {
      expect(InventoryTransaction.TRANSACTION_TYPES).toEqual(['sale', 'restock', 'adjustment', 'waste']);
    });

    it('should have correct REFERENCE_TYPES', () => {
      expect(InventoryTransaction.REFERENCE_TYPES).toEqual(['order', 'manual', 'recipe']);
    });
  });
});