/**
 * Unit tests for Product database operations
 * Tests Requirements: 1.1, 1.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const { ProductQueries } = require('../utils/product-database');
const { DatabaseUtils } = require('../utils/database');

describe('Product Database Operations', () => {
  // Test data
  const testProduct = {
    name: 'Test Tomatoes',
    description: 'Fresh red tomatoes for testing',
    unit_of_measure: 'kg',
    current_quantity: 25.5,
    low_stock_threshold: 5,
    cost_per_unit: 3.99,
    supplier_info: 'Test Farm Co.'
  };

  const minimalProduct = {
    name: 'Minimal Product',
    unit_of_measure: 'pieces',
    current_quantity: 10
  };

  let createdProductIds = [];

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

  describe('createProduct', () => {
    it('should create a product with all fields', async () => {
      const result = await ProductQueries.createProduct(testProduct);
      createdProductIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(testProduct.name);
      expect(result.description).toBe(testProduct.description);
      expect(result.unit_of_measure).toBe(testProduct.unit_of_measure);
      expect(result.current_quantity).toBe(testProduct.current_quantity);
      expect(result.low_stock_threshold).toBe(testProduct.low_stock_threshold);
      expect(result.cost_per_unit).toBe(testProduct.cost_per_unit);
      expect(result.supplier_info).toBe(testProduct.supplier_info);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should create a product with minimal fields', async () => {
      const result = await ProductQueries.createProduct(minimalProduct);
      createdProductIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(minimalProduct.name);
      expect(result.unit_of_measure).toBe(minimalProduct.unit_of_measure);
      expect(result.current_quantity).toBe(minimalProduct.current_quantity);
      expect(result.low_stock_threshold).toBe(10); // Default value
      expect(result.description).toBeNull();
      expect(result.cost_per_unit).toBeNull();
      expect(result.supplier_info).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const invalidProduct = {
        name: null, // This should cause a database error
        unit_of_measure: 'kg',
        current_quantity: 5
      };

      await expect(ProductQueries.createProduct(invalidProduct)).rejects.toThrow();
    });
  });

  describe('getProducts', () => {
    beforeEach(async () => {
      // Create test products
      const product1 = await ProductQueries.createProduct({
        name: 'Apples',
        unit_of_measure: 'kg',
        current_quantity: 15,
        low_stock_threshold: 10
      });
      const product2 = await ProductQueries.createProduct({
        name: 'Bananas',
        unit_of_measure: 'kg',
        current_quantity: 5,
        low_stock_threshold: 10
      });
      const product3 = await ProductQueries.createProduct({
        name: 'Oranges',
        unit_of_measure: 'pieces',
        current_quantity: 0,
        low_stock_threshold: 5
      });
      
      createdProductIds.push(product1.id, product2.id, product3.id);
    });

    it('should get all products with default options', async () => {
      const products = await ProductQueries.getProducts();
      
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThanOrEqual(3);
      
      // Should be sorted by name by default
      const names = products.map(p => p.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should filter products by search term', async () => {
      const products = await ProductQueries.getProducts({ search: 'Apple' });
      
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.some(p => p.name.includes('Apples'))).toBe(true);
    });

    it('should filter products by unit', async () => {
      const products = await ProductQueries.getProducts({ unit: 'kg' });
      
      expect(products.length).toBeGreaterThanOrEqual(2);
      expect(products.every(p => p.unit_of_measure === 'kg')).toBe(true);
    });

    it('should filter low stock products', async () => {
      const products = await ProductQueries.getProducts({ lowStock: true });
      
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.every(p => p.current_quantity <= p.low_stock_threshold && p.current_quantity > 0)).toBe(true);
    });

    it('should filter out of stock products', async () => {
      const products = await ProductQueries.getProducts({ outOfStock: true });
      
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.every(p => p.current_quantity == 0)).toBe(true);
    });

    it('should handle pagination', async () => {
      const page1 = await ProductQueries.getProducts({ page: 1, limit: 2 });
      const page2 = await ProductQueries.getProducts({ page: 2, limit: 2 });
      
      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
      
      // Products should be different between pages
      const page1Ids = page1.map(p => p.id);
      const page2Ids = page2.map(p => p.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should handle sorting', async () => {
      const products = await ProductQueries.getProducts({ 
        sortBy: 'current_quantity', 
        sortOrder: 'DESC' 
      });
      
      expect(products.length).toBeGreaterThanOrEqual(3);
      
      // Should be sorted by quantity descending
      for (let i = 0; i < products.length - 1; i++) {
        expect(products[i].current_quantity).toBeGreaterThanOrEqual(products[i + 1].current_quantity);
      }
    });
  });

  describe('getProductById', () => {
    it('should get a product by ID', async () => {
      const created = await ProductQueries.createProduct(testProduct);
      createdProductIds.push(created.id);

      const retrieved = await ProductQueries.getProductById(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe(testProduct.name);
    });

    it('should return null for non-existent product', async () => {
      const result = await ProductQueries.getProductById(99999);
      expect(result).toBeNull();
    });
  });

  describe('getProductByName', () => {
    it('should get a product by name', async () => {
      const created = await ProductQueries.createProduct(testProduct);
      createdProductIds.push(created.id);

      const retrieved = await ProductQueries.getProductByName(testProduct.name);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe(testProduct.name);
    });

    it('should return null for non-existent product name', async () => {
      const result = await ProductQueries.getProductByName('Non-existent Product');
      expect(result).toBeNull();
    });

    it('should exclude specified ID when checking name uniqueness', async () => {
      const created = await ProductQueries.createProduct(testProduct);
      createdProductIds.push(created.id);

      const result = await ProductQueries.getProductByName(testProduct.name, created.id);
      expect(result).toBeNull();
    });
  });

  describe('updateProduct', () => {
    it('should update a product with partial data', async () => {
      const created = await ProductQueries.createProduct(testProduct);
      createdProductIds.push(created.id);

      const updateData = {
        name: 'Updated Tomatoes',
        current_quantity: 30
      };

      const updated = await ProductQueries.updateProduct(created.id, updateData);
      
      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe(updateData.name);
      expect(updated.current_quantity).toBe(updateData.current_quantity);
      expect(updated.description).toBe(testProduct.description); // Unchanged
      expect(updated.updated_at).not.toBe(created.updated_at);
    });

    it('should return null for non-existent product', async () => {
      const result = await ProductQueries.updateProduct(99999, { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should handle empty update data', async () => {
      const created = await ProductQueries.createProduct(testProduct);
      createdProductIds.push(created.id);

      const updated = await ProductQueries.updateProduct(created.id, {});
      
      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe(created.name);
    });
  });

  describe('deleteProduct', () => {
    it('should delete an existing product', async () => {
      const created = await ProductQueries.createProduct(testProduct);
      
      const deleted = await ProductQueries.deleteProduct(created.id);
      expect(deleted).toBe(true);

      const retrieved = await ProductQueries.getProductById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent product', async () => {
      const result = await ProductQueries.deleteProduct(99999);
      expect(result).toBe(false);
    });
  });

  describe('getProductCount', () => {
    beforeEach(async () => {
      // Create test products
      const product1 = await ProductQueries.createProduct({
        name: 'Count Test 1',
        unit_of_measure: 'kg',
        current_quantity: 15
      });
      const product2 = await ProductQueries.createProduct({
        name: 'Count Test 2',
        unit_of_measure: 'pieces',
        current_quantity: 0
      });
      
      createdProductIds.push(product1.id, product2.id);
    });

    it('should get total count of products', async () => {
      const count = await ProductQueries.getProductCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should get filtered count', async () => {
      const count = await ProductQueries.getProductCount({ search: 'Count Test' });
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getLowStockProducts', () => {
    beforeEach(async () => {
      const lowStockProduct = await ProductQueries.createProduct({
        name: 'Low Stock Item',
        unit_of_measure: 'kg',
        current_quantity: 3,
        low_stock_threshold: 5
      });
      
      createdProductIds.push(lowStockProduct.id);
    });

    it('should get products with low stock', async () => {
      const products = await ProductQueries.getLowStockProducts();
      
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.every(p => p.current_quantity <= p.low_stock_threshold && p.current_quantity > 0)).toBe(true);
    });
  });

  describe('getOutOfStockProducts', () => {
    beforeEach(async () => {
      const outOfStockProduct = await ProductQueries.createProduct({
        name: 'Out of Stock Item',
        unit_of_measure: 'kg',
        current_quantity: 0
      });
      
      createdProductIds.push(outOfStockProduct.id);
    });

    it('should get products that are out of stock', async () => {
      const products = await ProductQueries.getOutOfStockProducts();
      
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.every(p => p.current_quantity == 0)).toBe(true);
    });
  });

  describe('getUsedUnits', () => {
    beforeEach(async () => {
      const product1 = await ProductQueries.createProduct({
        name: 'Unit Test 1',
        unit_of_measure: 'kg',
        current_quantity: 10
      });
      const product2 = await ProductQueries.createProduct({
        name: 'Unit Test 2',
        unit_of_measure: 'l',
        current_quantity: 5
      });
      
      createdProductIds.push(product1.id, product2.id);
    });

    it('should get unique units used in products', async () => {
      const units = await ProductQueries.getUsedUnits();
      
      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBeGreaterThanOrEqual(2);
      expect(units.includes('kg')).toBe(true);
      expect(units.includes('l')).toBe(true);
      
      // Should be unique
      const uniqueUnits = [...new Set(units)];
      expect(units.length).toBe(uniqueUnits.length);
    });
  });
});