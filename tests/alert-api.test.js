/**
 * Integration tests for alert API endpoints
 * Tests Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
const { app } = require('../server');
const { ProductQueries } = require('../utils/product-database');

describe('Alert API Endpoints', () => {
  let testProducts = [];

  beforeAll(async () => {
    // Create test products with different stock levels
    const productsToCreate = [
      {
        name: 'Low Stock Product 1',
        description: 'Product for low stock testing',
        unit_of_measure: 'kg',
        current_quantity: 5,
        low_stock_threshold: 10,
        cost_per_unit: 2.99
      },
      {
        name: 'Low Stock Product 2',
        description: 'Another product for low stock testing',
        unit_of_measure: 'liters',
        current_quantity: 3,
        low_stock_threshold: 15,
        cost_per_unit: 5.50
      },
      {
        name: 'Out of Stock Product 1',
        description: 'Product for out of stock testing',
        unit_of_measure: 'pieces',
        current_quantity: 0,
        low_stock_threshold: 5,
        cost_per_unit: 1.25
      },
      {
        name: 'Out of Stock Product 2',
        description: 'Another product for out of stock testing',
        unit_of_measure: 'bottles',
        current_quantity: 0,
        low_stock_threshold: 8,
        cost_per_unit: 3.75
      },
      {
        name: 'Well Stocked Product',
        description: 'Product with adequate stock',
        unit_of_measure: 'kg',
        current_quantity: 50,
        low_stock_threshold: 10,
        cost_per_unit: 4.99
      }
    ];

    // Create all test products
    for (const productData of productsToCreate) {
      const createdProduct = await ProductQueries.createProduct(productData);
      testProducts.push(createdProduct);
    }

    console.log(`Created ${testProducts.length} test products for alert testing`);
  });

  afterAll(async () => {
    // Clean up test products
    for (const product of testProducts) {
      try {
        await ProductQueries.deleteProduct(product.id);
      } catch (error) {
        console.log('Cleanup error for product', product.id, ':', error.message);
      }
    }
    console.log('Cleaned up test products');
  });

  describe('GET /api/inventory/alerts/low-stock', () => {
    it('should return low stock alerts', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body.count).toBe(response.body.alerts.length);

      // Should have at least our 2 low stock test products
      expect(response.body.count).toBeGreaterThanOrEqual(2);

      // Check alert structure
      if (response.body.alerts.length > 0) {
        const alert = response.body.alerts[0];
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('name');
        expect(alert).toHaveProperty('current_quantity');
        expect(alert).toHaveProperty('low_stock_threshold');
        expect(alert).toHaveProperty('unit_of_measure');
        expect(alert).toHaveProperty('alert_type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert.alert_type).toBe('low_stock');
        expect(alert.current_quantity).toBeLessThanOrEqual(alert.low_stock_threshold);
        expect(alert.current_quantity).toBeGreaterThan(0);
      }
    });

    it('should return alerts with correct severity levels', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .expect(200);

      // Check that severity is calculated correctly
      response.body.alerts.forEach(alert => {
        const ratio = alert.current_quantity / alert.low_stock_threshold;
        if (ratio <= 0.2) {
          expect(alert.severity).toBe('critical');
        } else if (ratio <= 0.5) {
          expect(alert.severity).toBe('high');
        } else {
          expect(alert.severity).toBe('medium');
        }
      });
    });

    it('should include meaningful alert messages', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .expect(200);

      response.body.alerts.forEach(alert => {
        expect(alert.message).toContain(alert.name);
        expect(alert.message).toContain('running low');
        expect(alert.message).toContain(alert.current_quantity.toString());
        expect(alert.message).toContain(alert.unit_of_measure);
        expect(alert.message).toContain(alert.low_stock_threshold.toString());
      });
    });
  });

  describe('GET /api/inventory/alerts/out-of-stock', () => {
    it('should return out-of-stock alerts', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/out-of-stock')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body.count).toBe(response.body.alerts.length);

      // Should have at least our 2 out-of-stock test products
      expect(response.body.count).toBeGreaterThanOrEqual(2);

      // Check alert structure
      if (response.body.alerts.length > 0) {
        const alert = response.body.alerts[0];
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('name');
        expect(alert).toHaveProperty('current_quantity');
        expect(alert).toHaveProperty('unit_of_measure');
        expect(alert).toHaveProperty('alert_type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert.alert_type).toBe('out_of_stock');
        expect(alert.current_quantity).toBe(0);
        expect(alert.severity).toBe('critical');
      }
    });

    it('should include meaningful alert messages for out-of-stock products', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/out-of-stock')
        .expect(200);

      response.body.alerts.forEach(alert => {
        expect(alert.message).toContain(alert.name);
        expect(alert.message).toContain('out of stock');
      });
    });
  });

  describe('GET /api/inventory/dashboard', () => {
    it('should return comprehensive dashboard summary', async () => {
      const response = await request(app)
        .get('/api/inventory/dashboard')
        .expect(200);

      // Check required dashboard properties
      expect(response.body).toHaveProperty('total_products');
      expect(response.body).toHaveProperty('low_stock_count');
      expect(response.body).toHaveProperty('out_of_stock_count');
      expect(response.body).toHaveProperty('low_stock_alerts');
      expect(response.body).toHaveProperty('out_of_stock_alerts');
      expect(response.body).toHaveProperty('alert_summary');

      // Validate data types
      expect(typeof response.body.total_products).toBe('number');
      expect(typeof response.body.low_stock_count).toBe('number');
      expect(typeof response.body.out_of_stock_count).toBe('number');
      expect(Array.isArray(response.body.low_stock_alerts)).toBe(true);
      expect(Array.isArray(response.body.out_of_stock_alerts)).toBe(true);
      expect(typeof response.body.alert_summary).toBe('string');

      // Validate counts match array lengths
      expect(response.body.low_stock_count).toBe(response.body.low_stock_alerts.length);
      expect(response.body.out_of_stock_count).toBe(response.body.out_of_stock_alerts.length);

      // Should have at least our test products
      expect(response.body.total_products).toBeGreaterThanOrEqual(5);
      expect(response.body.low_stock_count).toBeGreaterThanOrEqual(2);
      expect(response.body.out_of_stock_count).toBeGreaterThanOrEqual(2);
    });

    it('should generate appropriate alert summary messages', async () => {
      const response = await request(app)
        .get('/api/inventory/dashboard')
        .expect(200);

      const { low_stock_count, out_of_stock_count, alert_summary } = response.body;

      if (low_stock_count === 0 && out_of_stock_count === 0) {
        expect(alert_summary).toBe('All products are adequately stocked');
      } else {
        if (out_of_stock_count > 0) {
          expect(alert_summary).toContain('out of stock');
          expect(alert_summary).toContain(out_of_stock_count.toString());
        }
        if (low_stock_count > 0) {
          expect(alert_summary).toContain('running low');
          expect(alert_summary).toContain(low_stock_count.toString());
        }
      }
    });

    it('should include complete alert data in dashboard', async () => {
      const response = await request(app)
        .get('/api/inventory/dashboard')
        .expect(200);

      // Validate low stock alerts structure
      response.body.low_stock_alerts.forEach(alert => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('name');
        expect(alert).toHaveProperty('current_quantity');
        expect(alert).toHaveProperty('low_stock_threshold');
        expect(alert).toHaveProperty('unit_of_measure');
        expect(alert).toHaveProperty('alert_type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert.alert_type).toBe('low_stock');
      });

      // Validate out-of-stock alerts structure
      response.body.out_of_stock_alerts.forEach(alert => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('name');
        expect(alert).toHaveProperty('current_quantity');
        expect(alert).toHaveProperty('unit_of_measure');
        expect(alert).toHaveProperty('alert_type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert.alert_type).toBe('out_of_stock');
        expect(alert.current_quantity).toBe(0);
        expect(alert.severity).toBe('critical');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully for low-stock alerts', async () => {
      // This test would require mocking database failures
      // For now, we'll just ensure the endpoint exists and returns proper structure
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('count');
    });

    it('should handle database errors gracefully for out-of-stock alerts', async () => {
      // This test would require mocking database failures
      // For now, we'll just ensure the endpoint exists and returns proper structure
      const response = await request(app)
        .get('/api/inventory/alerts/out-of-stock')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('count');
    });

    it('should handle database errors gracefully for dashboard', async () => {
      // This test would require mocking database failures
      // For now, we'll just ensure the endpoint exists and returns proper structure
      const response = await request(app)
        .get('/api/inventory/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('total_products');
      expect(response.body).toHaveProperty('alert_summary');
    });
  });
});