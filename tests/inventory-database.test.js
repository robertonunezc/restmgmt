/**
 * Tests for inventory database utilities
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  ProductQueries, 
  InventoryTransactionQueries, 
  RecipeIngredientProductQueries, 
  AlertQueries 
} from '../utils/inventory-database.js';

describe('Inventory Database Utilities', () => {
  let testProductIds = [];

  afterAll(async () => {
    // Clean up test products
    for (const productId of testProductIds) {
      try {
        await ProductQueries.deleteProduct(productId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('ProductQueries', () => {
    it('should get products with stock status', async () => {
      const products = await ProductQueries.getProducts({ limit: 5 });
      
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      
      // Check that each product has required fields
      products.forEach(product => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('unit_of_measure');
        expect(product).toHaveProperty('current_quantity');
        expect(product).toHaveProperty('stock_status');
        expect(['in_stock', 'low_stock', 'out_of_stock']).toContain(product.stock_status);
      });
    });

    it('should get product by ID', async () => {
      const product = await ProductQueries.getProductById(1);
      
      expect(product).toBeTruthy();
      expect(product.id).toBe(1);
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('stock_status');
    });

    it('should return null for non-existent product', async () => {
      const product = await ProductQueries.getProductById(99999);
      expect(product).toBeNull();
    });

    it('should create new product', async () => {
      const productData = {
        name: 'Test Product - Inventory',
        description: 'A test product for unit testing',
        unit_of_measure: 'pieces',
        current_quantity: 50,
        low_stock_threshold: 10,
        cost_per_unit: 2.50,
        supplier_info: 'Test Supplier'
      };

      const product = await ProductQueries.createProduct(productData);
      testProductIds.push(product.id);
      
      expect(product).toBeTruthy();
      expect(product.name).toBe(productData.name);
      expect(product.unit_of_measure).toBe(productData.unit_of_measure);
      expect(parseFloat(product.current_quantity)).toBe(productData.current_quantity);
      expect(product.low_stock_threshold).toBe(productData.low_stock_threshold);
    });

    it('should update product', async () => {
      // First create a product
      const productData = {
        name: 'Update Test Product - Inventory',
        unit_of_measure: 'kg',
        current_quantity: 25
      };
      const product = await ProductQueries.createProduct(productData);
      testProductIds.push(product.id);

      // Update it
      const updateData = {
        name: 'Updated Product Name - Inventory',
        unit_of_measure: 'liters',
        low_stock_threshold: 15
      };
      const updatedProduct = await ProductQueries.updateProduct(product.id, updateData);

      expect(updatedProduct).toBeTruthy();
      expect(updatedProduct.name).toBe(updateData.name);
      expect(updatedProduct.unit_of_measure).toBe(updateData.unit_of_measure);
      expect(updatedProduct.low_stock_threshold).toBe(updateData.low_stock_threshold);
    });

    it('should get product count', async () => {
      const count = await ProductQueries.getProductCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('InventoryTransactionQueries', () => {
    it('should create transaction and update product quantity', async () => {
      // Get initial product state
      const initialProduct = await ProductQueries.getProductById(1);
      const initialQuantity = parseFloat(initialProduct.current_quantity);

      // Create restock transaction
      const transactionData = {
        product_id: 1,
        transaction_type: 'restock',
        quantity_change: 10.0,
        reference_type: 'manual',
        notes: 'Test restock transaction'
      };

      const result = await InventoryTransactionQueries.createTransaction(transactionData);
      
      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('product');
      expect(result.transaction.product_id).toBe(1);
      expect(result.transaction.transaction_type).toBe('restock');
      expect(parseFloat(result.transaction.quantity_change)).toBe(10.0);
      
      // Check product quantity was updated
      const expectedQuantity = initialQuantity + 10.0;
      expect(parseFloat(result.product.current_quantity)).toBe(expectedQuantity);

      // Verify by getting product again
      const updatedProduct = await ProductQueries.getProductById(1);
      expect(parseFloat(updatedProduct.current_quantity)).toBe(expectedQuantity);
    });

    it('should get transactions with filtering', async () => {
      const transactions = await InventoryTransactionQueries.getTransactions({ 
        product_id: 1, 
        limit: 10 
      });
      
      expect(Array.isArray(transactions)).toBe(true);
      
      transactions.forEach(transaction => {
        expect(transaction.product_id).toBe(1);
        expect(transaction).toHaveProperty('product_name');
        expect(transaction).toHaveProperty('unit_of_measure');
        expect(transaction).toHaveProperty('transaction_type');
        expect(transaction).toHaveProperty('quantity_change');
      });
    });
  });

  describe('RecipeIngredientProductQueries', () => {
    it('should get recipe product links', async () => {
      const links = await RecipeIngredientProductQueries.getRecipeProductLinks(1);
      
      expect(Array.isArray(links)).toBe(true);
      expect(links.length).toBeGreaterThan(0);
      
      links.forEach(link => {
        expect(link).toHaveProperty('recipe_ingredient_id');
        expect(link).toHaveProperty('product_id');
        expect(link).toHaveProperty('quantity_per_serving');
        expect(link).toHaveProperty('ingredient_name');
        expect(link).toHaveProperty('product_name');
      });
    });

    it('should create recipe ingredient product link', async () => {
      // Create a test product first
      const productData = {
        name: 'Test Link Product - Inventory',
        unit_of_measure: 'grams',
        current_quantity: 100
      };
      const product = await ProductQueries.createProduct(productData);
      testProductIds.push(product.id);

      // Create link (using existing recipe ingredient)
      const linkData = {
        recipe_ingredient_id: 1, // Should exist from sample data
        product_id: product.id,
        quantity_per_serving: 5.0
      };

      const link = await RecipeIngredientProductQueries.createLink(linkData);
      
      expect(link).toBeTruthy();
      expect(link.recipe_ingredient_id).toBe(linkData.recipe_ingredient_id);
      expect(link.product_id).toBe(linkData.product_id);
      expect(parseFloat(link.quantity_per_serving)).toBe(linkData.quantity_per_serving);

      // Clean up link
      await RecipeIngredientProductQueries.deleteLink(link.id);
    });
  });

  describe('AlertQueries', () => {
    it('should get dashboard summary', async () => {
      const summary = await AlertQueries.getDashboardSummary();
      
      expect(summary).toBeTruthy();
      expect(summary).toHaveProperty('total_products');
      expect(summary).toHaveProperty('out_of_stock_count');
      expect(summary).toHaveProperty('low_stock_count');
      expect(summary).toHaveProperty('in_stock_count');
      expect(summary).toHaveProperty('total_inventory_value');
      
      expect(typeof parseInt(summary.total_products)).toBe('number');
      expect(parseInt(summary.total_products)).toBeGreaterThan(0);
    });

    it('should get low stock products', async () => {
      const lowStockProducts = await AlertQueries.getLowStockProducts();
      
      expect(Array.isArray(lowStockProducts)).toBe(true);
      
      lowStockProducts.forEach(product => {
        expect(parseFloat(product.current_quantity)).toBeGreaterThan(0);
        expect(parseFloat(product.current_quantity)).toBeLessThanOrEqual(product.low_stock_threshold);
      });
    });

    it('should get out of stock products', async () => {
      const outOfStockProducts = await AlertQueries.getOutOfStockProducts();
      
      expect(Array.isArray(outOfStockProducts)).toBe(true);
      
      outOfStockProducts.forEach(product => {
        expect(parseFloat(product.current_quantity)).toBe(0);
      });
    });
  });
});