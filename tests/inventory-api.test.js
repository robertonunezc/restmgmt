/**
 * Integration tests for Inventory API endpoints
 * Tests Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
const { app } = require('../server');
const { ProductQueries } = require('../utils/product-database');

describe('Inventory API Endpoints', () => {
  let createdProductIds = [];

  // Test data
  const validProduct = {
    name: 'API Test Tomatoes',
    description: 'Fresh red tomatoes for API testing',
    unit_of_measure: 'kg',
    current_quantity: 25.5,
    low_stock_threshold: 5,
    cost_per_unit: 3.99,
    supplier_info: 'Test Farm Co.'
  };

  const minimalProduct = {
    name: 'API Minimal Product',
    unit_of_measure: 'pieces',
    current_quantity: 10
  };

  // Wait for server to initialize
  beforeAll(async () => {
    // Give the server time to load ES modules
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    // Clean up created products
    for (const id of createdProductIds) {
      try {
        await ProductQueries.deleteProduct(id);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdProductIds = [];
  });

  describe('GET /api/inventory/products', () => {
    beforeEach(async () => {
      // Create test products
      const product1 = await ProductQueries.createProduct({
        name: 'API Test Apples',
        unit_of_measure: 'kg',
        current_quantity: 15,
        low_stock_threshold: 10
      });
      const product2 = await ProductQueries.createProduct({
        name: 'API Test Bananas',
        unit_of_measure: 'kg',
        current_quantity: 5,
        low_stock_threshold: 10
      });
      const product3 = await ProductQueries.createProduct({
        name: 'API Test Oranges',
        unit_of_measure: 'pieces',
        current_quantity: 0,
        low_stock_threshold: 5
      });
      
      createdProductIds.push(product1.id, product2.id, product3.id);
    });

    it('should get all products with default pagination', async () => {
      const response = await request(app)
        .get('/api/inventory/products')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeGreaterThanOrEqual(3);
      
      // Check pagination metadata
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter products by search term', async () => {
      const response = await request(app)
        .get('/api/inventory/products?search=API Test Apple')
        .expect(200);

      expect(response.body.products.length).toBeGreaterThanOrEqual(1);
      expect(response.body.products.some(p => p.name.includes('Apples'))).toBe(true);
    });

    it('should filter products by unit', async () => {
      const response = await request(app)
        .get('/api/inventory/products?unit=kg')
        .expect(200);

      expect(response.body.products.length).toBeGreaterThanOrEqual(2);
      expect(response.body.products.every(p => p.unit_of_measure === 'kg')).toBe(true);
    });

    it('should filter low stock products', async () => {
      const response = await request(app)
        .get('/api/inventory/products?lowStock=true')
        .expect(200);

      expect(response.body.products.length).toBeGreaterThanOrEqual(1);
      expect(response.body.products.every(p => p.current_quantity <= p.low_stock_threshold && p.current_quantity > 0)).toBe(true);
    });

    it('should filter out of stock products', async () => {
      const response = await request(app)
        .get('/api/inventory/products?outOfStock=true')
        .expect(200);

      expect(response.body.products.length).toBeGreaterThanOrEqual(1);
      expect(response.body.products.every(p => p.current_quantity == 0)).toBe(true);
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/inventory/products?page=1&limit=2')
        .expect(200);

      expect(response.body.products.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should handle sorting', async () => {
      const response = await request(app)
        .get('/api/inventory/products?sortBy=current_quantity&sortOrder=DESC')
        .expect(200);

      expect(response.body.products.length).toBeGreaterThanOrEqual(3);
      
      // Should be sorted by quantity descending
      for (let i = 0; i < response.body.products.length - 1; i++) {
        expect(response.body.products[i].current_quantity).toBeGreaterThanOrEqual(response.body.products[i + 1].current_quantity);
      }
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/inventory/products?page=0')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid page parameter');
    });

    it('should validate sort parameters', async () => {
      const response = await request(app)
        .get('/api/inventory/products?sortBy=invalid_field')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid sortBy parameter');
    });
  });

  describe('POST /api/inventory/products', () => {
    it('should create a product with all fields', async () => {
      const response = await request(app)
        .post('/api/inventory/products')
        .send(validProduct)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('product');
      expect(response.body.product.name).toBe(validProduct.name);
      expect(response.body.product.description).toBe(validProduct.description);
      expect(response.body.product.unit_of_measure).toBe(validProduct.unit_of_measure);
      expect(response.body.product.current_quantity).toBe(validProduct.current_quantity);
      
      createdProductIds.push(response.body.product.id);
    });

    it('should create a product with minimal fields', async () => {
      const response = await request(app)
        .post('/api/inventory/products')
        .send(minimalProduct)
        .expect(201);

      expect(response.body).toHaveProperty('product');
      expect(response.body.product.name).toBe(minimalProduct.name);
      expect(response.body.product.unit_of_measure).toBe(minimalProduct.unit_of_measure);
      expect(response.body.product.current_quantity).toBe(minimalProduct.current_quantity);
      expect(response.body.product.low_stock_threshold).toBe(10); // Default value
      
      createdProductIds.push(response.body.product.id);
    });

    it('should validate required fields', async () => {
      const invalidProduct = {
        description: 'Missing required fields'
      };

      const response = await request(app)
        .post('/api/inventory/products')
        .send(invalidProduct)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate product names', async () => {
      // Create first product
      const response1 = await request(app)
        .post('/api/inventory/products')
        .send(validProduct)
        .expect(201);
      
      createdProductIds.push(response1.body.product.id);

      // Try to create duplicate
      const response2 = await request(app)
        .post('/api/inventory/products')
        .send(validProduct)
        .expect(409);

      expect(response2.body).toHaveProperty('error');
      expect(response2.body.error).toContain('already exists');
    });

    it('should validate unit of measure', async () => {
      const invalidProduct = {
        ...validProduct,
        unit_of_measure: 'invalid_unit'
      };

      const response = await request(app)
        .post('/api/inventory/products')
        .send(invalidProduct)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate negative quantities', async () => {
      const invalidProduct = {
        ...validProduct,
        current_quantity: -5
      };

      const response = await request(app)
        .post('/api/inventory/products')
        .send(invalidProduct)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/inventory/products/:id', () => {
    it('should get a product by ID', async () => {
      const created = await ProductQueries.createProduct(validProduct);
      createdProductIds.push(created.id);

      const response = await request(app)
        .get(`/api/inventory/products/${created.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('product');
      expect(response.body.product.id).toBe(created.id);
      expect(response.body.product.name).toBe(validProduct.name);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/inventory/products/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should validate product ID parameter', async () => {
      const response = await request(app)
        .get('/api/inventory/products/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid product ID');
    });
  });

  describe('PUT /api/inventory/products/:id', () => {
    it('should update a product with partial data', async () => {
      const created = await ProductQueries.createProduct(validProduct);
      createdProductIds.push(created.id);

      const updateData = {
        name: 'Updated API Test Tomatoes',
        current_quantity: 30
      };

      const response = await request(app)
        .put(`/api/inventory/products/${created.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('product');
      expect(response.body.product.name).toBe(updateData.name);
      expect(response.body.product.current_quantity).toBe(updateData.current_quantity);
      expect(response.body.product.description).toBe(validProduct.description); // Unchanged
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .put('/api/inventory/products/99999')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should validate update data', async () => {
      const created = await ProductQueries.createProduct(validProduct);
      createdProductIds.push(created.id);

      const invalidUpdate = {
        current_quantity: -10
      };

      const response = await request(app)
        .put(`/api/inventory/products/${created.id}`)
        .send(invalidUpdate)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate names when updating', async () => {
      const product1 = await ProductQueries.createProduct(validProduct);
      const product2 = await ProductQueries.createProduct({
        ...minimalProduct,
        name: 'Different Name'
      });
      createdProductIds.push(product1.id, product2.id);

      const response = await request(app)
        .put(`/api/inventory/products/${product2.id}`)
        .send({ name: validProduct.name })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('DELETE /api/inventory/products/:id', () => {
    it('should delete an existing product', async () => {
      const created = await ProductQueries.createProduct(validProduct);

      const response = await request(app)
        .delete(`/api/inventory/products/${created.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');

      // Verify product is deleted
      const getResponse = await request(app)
        .get(`/api/inventory/products/${created.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .delete('/api/inventory/products/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should validate product ID parameter', async () => {
      const response = await request(app)
        .delete('/api/inventory/products/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid product ID');
    });
  });
});