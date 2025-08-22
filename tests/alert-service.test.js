/**
 * Unit tests for alert service functionality
 * Tests alert detection, generation, and validation functions
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
const { AlertService, LowStockAlert, OutOfStockAlert, DashboardSummary } = require('../utils/alert-service');
const { ProductQueries } = require('../utils/product-database');

// Note: This project uses integration tests rather than mocked unit tests
// The database-dependent tests are removed in favor of pure logic tests

describe('Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LowStockAlert', () => {
    it('should create a low stock alert with correct properties', () => {
      const product = {
        id: 1,
        name: 'Test Product',
        current_quantity: 5,
        low_stock_threshold: 10,
        unit_of_measure: 'kg'
      };

      const alert = new LowStockAlert(product);

      expect(alert.id).toBe(1);
      expect(alert.name).toBe('Test Product');
      expect(alert.current_quantity).toBe(5);
      expect(alert.low_stock_threshold).toBe(10);
      expect(alert.unit_of_measure).toBe('kg');
      expect(alert.alert_type).toBe('low_stock');
      expect(alert.severity).toBe('high'); // 5/10 = 0.5, which is exactly 50%, so it's 'high'
      expect(alert.message).toBe('Test Product is running low (5 kg remaining, threshold: 10)');
    });

    it('should calculate severity correctly for critical level (≤20% of threshold)', () => {
      const product = {
        id: 1,
        name: 'Critical Product',
        current_quantity: 2,
        low_stock_threshold: 10,
        unit_of_measure: 'pieces'
      };

      const alert = new LowStockAlert(product);
      expect(alert.severity).toBe('critical');
    });

    it('should calculate severity correctly for high level (≤50% of threshold)', () => {
      const product = {
        id: 1,
        name: 'High Priority Product',
        current_quantity: 4,
        low_stock_threshold: 10,
        unit_of_measure: 'liters'
      };

      const alert = new LowStockAlert(product);
      expect(alert.severity).toBe('high');
    });

    it('should calculate severity correctly for medium level (>50% of threshold)', () => {
      const product = {
        id: 1,
        name: 'Medium Priority Product',
        current_quantity: 8,
        low_stock_threshold: 10,
        unit_of_measure: 'kg'
      };

      const alert = new LowStockAlert(product);
      expect(alert.severity).toBe('medium');
    });
  });

  describe('OutOfStockAlert', () => {
    it('should create an out-of-stock alert with correct properties', () => {
      const product = {
        id: 2,
        name: 'Empty Product',
        current_quantity: 0,
        unit_of_measure: 'bottles'
      };

      const alert = new OutOfStockAlert(product);

      expect(alert.id).toBe(2);
      expect(alert.name).toBe('Empty Product');
      expect(alert.current_quantity).toBe(0);
      expect(alert.unit_of_measure).toBe('bottles');
      expect(alert.alert_type).toBe('out_of_stock');
      expect(alert.severity).toBe('critical');
      expect(alert.message).toBe('Empty Product is out of stock');
    });
  });

  describe('DashboardSummary', () => {
    it('should create dashboard summary with correct properties', () => {
      const data = {
        total_products: 50,
        low_stock_count: 3,
        out_of_stock_count: 2,
        low_stock_alerts: [],
        out_of_stock_alerts: []
      };

      const summary = new DashboardSummary(data);

      expect(summary.total_products).toBe(50);
      expect(summary.low_stock_count).toBe(3);
      expect(summary.out_of_stock_count).toBe(2);
      expect(summary.alert_summary).toBe('2 products out of stock, 3 products running low');
    });

    it('should generate correct alert summary when no alerts exist', () => {
      const data = {
        total_products: 50,
        low_stock_count: 0,
        out_of_stock_count: 0,
        low_stock_alerts: [],
        out_of_stock_alerts: []
      };

      const summary = new DashboardSummary(data);
      expect(summary.alert_summary).toBe('All products are adequately stocked');
    });

    it('should generate correct alert summary for only out-of-stock alerts', () => {
      const data = {
        total_products: 50,
        low_stock_count: 0,
        out_of_stock_count: 1,
        low_stock_alerts: [],
        out_of_stock_alerts: []
      };

      const summary = new DashboardSummary(data);
      expect(summary.alert_summary).toBe('1 product out of stock');
    });

    it('should generate correct alert summary for only low stock alerts', () => {
      const data = {
        total_products: 50,
        low_stock_count: 2,
        out_of_stock_count: 0,
        low_stock_alerts: [],
        out_of_stock_alerts: []
      };

      const summary = new DashboardSummary(data);
      expect(summary.alert_summary).toBe('2 products running low');
    });

    it('should handle plural forms correctly', () => {
      const data = {
        total_products: 50,
        low_stock_count: 1,
        out_of_stock_count: 1,
        low_stock_alerts: [],
        out_of_stock_alerts: []
      };

      const summary = new DashboardSummary(data);
      expect(summary.alert_summary).toBe('1 product out of stock, 1 product running low');
    });
  });

  // Database-dependent tests are handled in integration tests
  // These tests focus on pure logic and data structure validation

  describe('AlertService.isLowStock', () => {
    it('should return true for products with quantity <= threshold and > 0', () => {
      const product = { current_quantity: 5, low_stock_threshold: 10 };
      expect(AlertService.isLowStock(product)).toBe(true);
    });

    it('should return false for products with quantity > threshold', () => {
      const product = { current_quantity: 15, low_stock_threshold: 10 };
      expect(AlertService.isLowStock(product)).toBe(false);
    });

    it('should return false for products with quantity = 0', () => {
      const product = { current_quantity: 0, low_stock_threshold: 10 };
      expect(AlertService.isLowStock(product)).toBe(false);
    });

    it('should return false for invalid product data', () => {
      expect(AlertService.isLowStock(null)).toBe(false);
      expect(AlertService.isLowStock({})).toBe(false);
      expect(AlertService.isLowStock({ current_quantity: 'invalid' })).toBe(false);
    });
  });

  describe('AlertService.isOutOfStock', () => {
    it('should return true for products with quantity = 0', () => {
      const product = { current_quantity: 0 };
      expect(AlertService.isOutOfStock(product)).toBe(true);
    });

    it('should return false for products with quantity > 0', () => {
      const product = { current_quantity: 5 };
      expect(AlertService.isOutOfStock(product)).toBe(false);
    });

    it('should return false for invalid product data', () => {
      expect(AlertService.isOutOfStock(null)).toBe(false);
      expect(AlertService.isOutOfStock({})).toBe(false);
      expect(AlertService.isOutOfStock({ current_quantity: 'invalid' })).toBe(false);
    });
  });

  describe('AlertService.validateAlert', () => {
    it('should validate correct low stock alert structure', () => {
      const alert = {
        id: 1,
        name: 'Test Product',
        current_quantity: 5,
        unit_of_measure: 'kg',
        alert_type: 'low_stock',
        severity: 'medium',
        message: 'Test message'
      };

      expect(AlertService.validateAlert(alert)).toBe(true);
    });

    it('should validate correct out-of-stock alert structure', () => {
      const alert = {
        id: 2,
        name: 'Empty Product',
        current_quantity: 0,
        unit_of_measure: 'bottles',
        alert_type: 'out_of_stock',
        severity: 'critical',
        message: 'Out of stock message'
      };

      expect(AlertService.validateAlert(alert)).toBe(true);
    });

    it('should reject alerts with missing required fields', () => {
      const incompleteAlert = {
        id: 1,
        name: 'Test Product'
        // Missing other required fields
      };

      expect(AlertService.validateAlert(incompleteAlert)).toBe(false);
    });

    it('should reject alerts with invalid alert_type', () => {
      const invalidAlert = {
        id: 1,
        name: 'Test Product',
        current_quantity: 5,
        unit_of_measure: 'kg',
        alert_type: 'invalid_type',
        severity: 'medium',
        message: 'Test message'
      };

      expect(AlertService.validateAlert(invalidAlert)).toBe(false);
    });

    it('should reject alerts with invalid severity', () => {
      const invalidAlert = {
        id: 1,
        name: 'Test Product',
        current_quantity: 5,
        unit_of_measure: 'kg',
        alert_type: 'low_stock',
        severity: 'invalid_severity',
        message: 'Test message'
      };

      expect(AlertService.validateAlert(invalidAlert)).toBe(false);
    });

    it('should reject null or non-object inputs', () => {
      expect(AlertService.validateAlert(null)).toBe(false);
      expect(AlertService.validateAlert('string')).toBe(false);
      expect(AlertService.validateAlert(123)).toBe(false);
    });
  });

  describe('AlertService.validateDashboardSummary', () => {
    it('should validate correct dashboard summary structure', () => {
      const summary = {
        total_products: 50,
        low_stock_count: 3,
        out_of_stock_count: 2,
        low_stock_alerts: [],
        out_of_stock_alerts: [],
        alert_summary: 'Test summary'
      };

      expect(AlertService.validateDashboardSummary(summary)).toBe(true);
    });

    it('should reject summaries with missing required fields', () => {
      const incompleteSummary = {
        total_products: 50,
        low_stock_count: 3
        // Missing other required fields
      };

      expect(AlertService.validateDashboardSummary(incompleteSummary)).toBe(false);
    });

    it('should reject summaries with invalid data types', () => {
      const invalidSummary = {
        total_products: 'invalid',
        low_stock_count: 3,
        out_of_stock_count: 2,
        low_stock_alerts: [],
        out_of_stock_alerts: [],
        alert_summary: 'Test summary'
      };

      expect(AlertService.validateDashboardSummary(invalidSummary)).toBe(false);
    });

    it('should reject null or non-object inputs', () => {
      expect(AlertService.validateDashboardSummary(null)).toBe(false);
      expect(AlertService.validateDashboardSummary('string')).toBe(false);
      expect(AlertService.validateDashboardSummary([])).toBe(false);
    });
  });
});