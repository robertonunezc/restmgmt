import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Inventory Dashboard Frontend Integration', () => {
  describe('Dashboard Components', () => {
    it('should load inventory section in HTML', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('inventory-section');
      expect(response.text).toContain('out-of-stock-banner');
      expect(response.text).toContain('total-products');
      expect(response.text).toContain('low-stock-count');
      expect(response.text).toContain('out-of-stock-count');
      expect(response.text).toContain('total-value');
    });

    it('should include inventory navigation button', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('showSection(\'inventory\')');
      expect(response.text).toContain('Inventory');
    });

    it('should include inventory management tabs', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('products-tab');
      expect(response.text).toContain('alerts-tab');
      expect(response.text).toContain('transactions-tab');
      expect(response.text).toContain('recipe-links-tab');
    });

    it('should include product management modal', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('productModal');
      expect(response.text).toContain('productForm');
      expect(response.text).toContain('productName');
      expect(response.text).toContain('productQuantity');
    });

    it('should include inventory adjustment modal', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('adjustmentModal');
      expect(response.text).toContain('adjustmentForm');
      expect(response.text).toContain('adjustmentType');
      expect(response.text).toContain('adjustmentQuantity');
    });

    it('should include recipe linking modal', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('recipeLinkModal');
      expect(response.text).toContain('recipeLinkForm');
      expect(response.text).toContain('linkRecipeId');
      expect(response.text).toContain('linkProductId');
    });
  });

  describe('CSS Styles', () => {
    it('should load inventory-specific CSS styles', async () => {
      const response = await request(app).get('/styles.css');
      expect(response.status).toBe(200);
      expect(response.text).toContain('inventory-summary-card');
      expect(response.text).toContain('inventory-alert-item');
      expect(response.text).toContain('product-quantity-badge');
      expect(response.text).toContain('transaction-type-badge');
    });

    it('should include responsive styles for inventory', async () => {
      const response = await request(app).get('/styles.css');
      expect(response.status).toBe(200);
      expect(response.text).toContain('@media (max-width: 768px)');
      expect(response.text).toContain('inventory-summary-card .card-title');
    });
  });

  describe('JavaScript Functions', () => {
    it('should load app.js with inventory functions', async () => {
      const response = await request(app).get('/app.js');
      expect(response.status).toBe(200);
      expect(response.text).toContain('loadInventoryData');
      expect(response.text).toContain('loadProducts');
      expect(response.text).toContain('loadInventoryAlerts');
      expect(response.text).toContain('updateInventoryDashboard');
      expect(response.text).toContain('renderProductsList');
      expect(response.text).toContain('showAddProductModal');
      expect(response.text).toContain('saveProduct');
      expect(response.text).toContain('showAdjustmentModal');
      expect(response.text).toContain('saveAdjustment');
      expect(response.text).toContain('showRecipeLinkModal');
      expect(response.text).toContain('saveRecipeLink');
    });

    it('should include inventory variables', async () => {
      const response = await request(app).get('/app.js');
      expect(response.status).toBe(200);
      expect(response.text).toContain('let products = []');
      expect(response.text).toContain('let inventoryAlerts = { lowStock: [], outOfStock: [] }');
      expect(response.text).toContain('let inventoryTransactions = []');
      expect(response.text).toContain('let recipeLinks = []');
    });

    it('should include section switching for inventory', async () => {
      const response = await request(app).get('/app.js');
      expect(response.status).toBe(200);
      expect(response.text).toContain('else if (section === "inventory") loadInventoryData()');
    });
  });

  describe('Dashboard Widget Integration', () => {
    it('should include summary card elements', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('inventory-summary-card');
      expect(response.text).toContain('inventory-icon');
      expect(response.text).toContain('📦'); // Total products icon
      expect(response.text).toContain('⚠️'); // Low stock icon
      expect(response.text).toContain('❌'); // Out of stock icon
      expect(response.text).toContain('💰'); // Total value icon
    });

    it('should include quick action buttons', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('showAddProductModal()');
      expect(response.text).toContain('showBulkRestockModal()');
      expect(response.text).toContain('showInventoryReports()');
      expect(response.text).toContain('showRecipeLinking()');
    });

    it('should include alert banner functionality', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('out-of-stock-banner');
      expect(response.text).toContain('Out of Stock Alert!');
      expect(response.text).toContain('out-of-stock-items');
    });
  });
});