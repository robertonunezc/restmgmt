/**
 * Integration tests for inventory operation API endpoints
 * Tests Requirements: 3.1, 3.3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
const { app } = require('../server');
const { ProductQueries } = require('../utils/product-database');

describe('Inventory Operations API Endpoints', () => {
  let testProductId;

  beforeAll(async () => {
    // Create a test product for inventory operations
    const testProduct = {
      name: 'Test Product for Inventory Ops',
      description: 'Test product for inventory operations testing',
      unit_of_measure: 'kg',
      current_quantity: 50.0,
      low_stock_threshold: 10,
      cost_per_unit: 5.99,
      supplier_info: 'Test Supplier'
    };

    const createdProduct = await ProductQueries.createProduct(testProduct);
    testProductId = createdProduct.id;
  });

  afterAll(async () => {
    // Clean up test product
    if (testProductId) {
      try {
        await ProductQueries.deleteProduct(testProductId);
      } catch (error) {
        console.log('Cleanup error:', error.message);
      }
    }
  });

  describe('POST /api/inventory/products/:id/restock', () => {
    it('should restock product with valid data', async () => {
      const restockData = {
        quantity: 25.5,
        notes: 'Weekly restock delivery',
        reference_id: 12345
      };

      const response = await request(app)
        .post(`/api/inventory/products/${testProductId}/restock`)
        .send(restockData)
        .expect(200);

      expect(response.body.message).toBe('Product restocked successfully');
      expect(response.body.transaction).toBeDefined();
      expect(response.body.transaction.transaction_type).toBe('restock');
      expect(parseFloat(response.body.transaction.quantity_change)).toBe(25.5);
      expect(response.body.product).toBeDefined();
      expect(parseFloat(response.body.product.current_quantity)).toBe(75.5); // 50 + 25.5
    });

    it('should return 400 for invalid product ID', async () => {
      const restockData = {
        quantity: 10
      };

      const response = await request(app)
        .post('/api/inventory/products/invalid/restock')
        .send(restockData)
        .expect(400);

      expect(response.body.error).toContain('Invalid product ID');
    });

    it('should return 400 for missing quantity', async () => {
      const restockData = {
        notes: 'Missing quantity'
      };

      const response = await request(app)
        .post(`/api/inventory/products/${testProductId}/restock`)
        .send(restockData)
        .expect(400);

      expect(response.body.error).toContain('Quantity is required');
    });

    it('should return 400 for negative quantity', async () => {
      const restockData = {
        quantity: -10
      };

      const response = await request(app)
        .post(`/api/inventory/products/${testProductId}/restock`)
        .send(restockData)
        .expect(400);

      expect(response.body.error).toContain('positive number');
    });

    it('should return 404 for non-existent product', async () => {
      const restockData = {
        quantity: 10
      };

      const response = await request(app)
        .post('/api/inventory/products/99999/restock')
        .send(restockData)
        .expect(404);

      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('POST /api/inventory/products/:id/adjust', () => {
    it('should adjust product quantity with positive change', async () => {
      const adjustData = {
        quantity_change: 15.0,
        notes: 'Found extra inventory',
        reference_id: 54321
      };

      const response = await request(app)
        .post(`/api/inventory/products/${testProductId}/adjust`)
        .send(adjustData)
        .expect(200);

      expect(response.body.message).toBe('Product quantity adjusted successfully');
      expect(response.body.transaction).toBeDefined();
      expect(response.body.transaction.transaction_type).toBe('adjustment');
      expect(parseFloat(response.body.transaction.quantity_change)).toBe(15.0);
      expect(response.body.product).toBeDefined();
    });

    it('should adjust product quantity with negative change', async () => {
      const adjustData = {
        quantity_change: -5.0,
        notes: 'Damaged goods removal'
      };

      const response = await request(app)
        .post(`/api/inventory/products/${testProductId}/adjust`)
        .send(adjustData)
        .expect(200);

      expect(response.body.message).toBe('Product quantity adjusted successfully');
      expect(parseFloat(response.body.transaction.quantity_change)).toBe(-5.0);
    });

    it('should return 400 for invalid product ID', async () => {
      const adjustData = {
        quantity_change: 10
      };

      const response = await request(app)
        .post('/api/inventory/products/invalid/adjust')
        .send(adjustData)
        .expect(400);

      expect(response.body.error).toContain('Invalid product ID');
    });

    it('should return 400 for missing quantity_change', async () => {
      const adjustData = {
        notes: 'Missing quantity change'
      };

      const response = await request(app)
        .post(`/api/inventory/products/${testProductId}/adjust`)
        .send(adjustData)
        .expect(400);

      expect(response.body.error).toContain('Quantity change is required');
    });

    it('should return 400 for quantity change that would result in negative inventory', async () => {
      // First get current quantity
      const productResponse = await request(app)
        .get(`/api/inventory/products/${testProductId}`)
        .expect(200);

      const currentQuantity = parseFloat(productResponse.body.product.current_quantity);
      const excessiveDeduction = -(currentQuantity + 10); // More than current quantity

      const adjustData = {
        quantity_change: excessiveDeduction,
        notes: 'Excessive deduction test'
      };

      const response = await request(app)
        .post(`/api/inventory/products/${testProductId}/adjust`)
        .send(adjustData)
        .expect(400);

      expect(response.body.error).toContain('negative inventory');
    });
  });

  describe('GET /api/inventory/transactions', () => {
    it('should get transaction history without filters', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions')
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(50);
    });

    it('should get transaction history with product filter', async () => {
      const response = await request(app)
        .get(`/api/inventory/transactions?product_id=${testProductId}`)
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(Array.isArray(response.body.transactions)).toBe(true);
      
      // All transactions should be for our test product
      response.body.transactions.forEach(transaction => {
        expect(transaction.product_id).toBe(testProductId);
      });
    });

    it('should get transaction history with transaction type filter', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions?transaction_type=restock')
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      
      // All transactions should be restock type
      response.body.transactions.forEach(transaction => {
        expect(transaction.transaction_type).toBe('restock');
      });
    });

    it('should get transaction history with pagination', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions?page=1&limit=5')
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(response.body.transactions.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should return 400 for invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions?page=invalid')
        .expect(400);

      expect(response.body.error).toContain('Invalid page parameter');
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions?limit=300')
        .expect(400);

      expect(response.body.error).toContain('Invalid limit parameter');
    });

    it('should return 400 for invalid transaction_type', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions?transaction_type=invalid')
        .expect(400);

      expect(response.body.error).toContain('Invalid transaction_type');
    });

    it('should return 400 for invalid reference_type', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions?reference_type=invalid')
        .expect(400);

      expect(response.body.error).toContain('Invalid reference_type');
    });

    it('should return 400 for invalid product_id', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions?product_id=invalid')
        .expect(400);

      expect(response.body.error).toContain('Invalid product_id');
    });
  });
});