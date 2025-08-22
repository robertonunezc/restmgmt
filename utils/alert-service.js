/**
 * Alert service for inventory management
 * Provides functions for detecting and generating inventory alerts
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
 */

const { ProductQueries } = require('./product-database');

/**
 * Alert data structure for low stock alerts
 */
class LowStockAlert {
  constructor(product) {
    this.id = product.id;
    this.name = product.name;
    this.current_quantity = product.current_quantity;
    this.low_stock_threshold = product.low_stock_threshold;
    this.unit_of_measure = product.unit_of_measure;
    this.alert_type = 'low_stock';
    this.severity = this.calculateSeverity(product.current_quantity, product.low_stock_threshold);
    this.message = this.generateMessage(product);
  }

  calculateSeverity(currentQuantity, threshold) {
    const ratio = currentQuantity / threshold;
    if (ratio <= 0.2) return 'critical';
    if (ratio <= 0.5) return 'high';
    return 'medium';
  }

  generateMessage(product) {
    return `${product.name} is running low (${product.current_quantity} ${product.unit_of_measure} remaining, threshold: ${product.low_stock_threshold})`;
  }
}

/**
 * Alert data structure for out-of-stock alerts
 */
class OutOfStockAlert {
  constructor(product) {
    this.id = product.id;
    this.name = product.name;
    this.current_quantity = 0;
    this.unit_of_measure = product.unit_of_measure;
    this.alert_type = 'out_of_stock';
    this.severity = 'critical';
    this.message = this.generateMessage(product);
  }

  generateMessage(product) {
    return `${product.name} is out of stock`;
  }
}

/**
 * Dashboard summary data structure
 */
class DashboardSummary {
  constructor(data) {
    this.total_products = data.total_products || 0;
    this.low_stock_count = data.low_stock_count || 0;
    this.out_of_stock_count = data.out_of_stock_count || 0;
    this.low_stock_alerts = data.low_stock_alerts || [];
    this.out_of_stock_alerts = data.out_of_stock_alerts || [];
    this.alert_summary = this.generateAlertSummary();
  }

  generateAlertSummary() {
    const totalAlerts = this.low_stock_count + this.out_of_stock_count;
    
    if (totalAlerts === 0) {
      return 'All products are adequately stocked';
    }

    const messages = [];
    if (this.out_of_stock_count > 0) {
      messages.push(`${this.out_of_stock_count} product${this.out_of_stock_count > 1 ? 's' : ''} out of stock`);
    }
    if (this.low_stock_count > 0) {
      messages.push(`${this.low_stock_count} product${this.low_stock_count > 1 ? 's' : ''} running low`);
    }

    return messages.join(', ');
  }
}

/**
 * Alert service for inventory management
 */
class AlertService {
  /**
   * Detect and generate low stock alerts
   * @returns {Promise<Array<LowStockAlert>>} - Array of low stock alerts
   */
  static async getLowStockAlerts() {
    try {
      const lowStockProducts = await ProductQueries.getLowStockProducts();
      return lowStockProducts.map(product => new LowStockAlert(product));
    } catch (error) {
      throw new Error(`Failed to get low stock alerts: ${error.message}`);
    }
  }

  /**
   * Detect and generate out-of-stock alerts
   * @returns {Promise<Array<OutOfStockAlert>>} - Array of out-of-stock alerts
   */
  static async getOutOfStockAlerts() {
    try {
      const outOfStockProducts = await ProductQueries.getOutOfStockProducts();
      return outOfStockProducts.map(product => new OutOfStockAlert(product));
    } catch (error) {
      throw new Error(`Failed to get out-of-stock alerts: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive dashboard summary with all alert data
   * @returns {Promise<DashboardSummary>} - Dashboard summary with alerts
   */
  static async getDashboardSummary() {
    try {
      const [lowStockAlerts, outOfStockAlerts, totalProducts] = await Promise.all([
        this.getLowStockAlerts(),
        this.getOutOfStockAlerts(),
        ProductQueries.getProductCount()
      ]);

      return new DashboardSummary({
        total_products: totalProducts,
        low_stock_count: lowStockAlerts.length,
        out_of_stock_count: outOfStockAlerts.length,
        low_stock_alerts: lowStockAlerts,
        out_of_stock_alerts: outOfStockAlerts
      });
    } catch (error) {
      throw new Error(`Failed to generate dashboard summary: ${error.message}`);
    }
  }

  /**
   * Check if a specific product should trigger a low stock alert
   * @param {Object} product - Product object
   * @returns {boolean} - True if product is low stock
   */
  static isLowStock(product) {
    if (!product || typeof product.current_quantity !== 'number' || typeof product.low_stock_threshold !== 'number') {
      return false;
    }
    return product.current_quantity <= product.low_stock_threshold && product.current_quantity > 0;
  }

  /**
   * Check if a specific product should trigger an out-of-stock alert
   * @param {Object} product - Product object
   * @returns {boolean} - True if product is out of stock
   */
  static isOutOfStock(product) {
    if (!product || typeof product.current_quantity !== 'number') {
      return false;
    }
    return product.current_quantity === 0;
  }

  /**
   * Validate alert data structure
   * @param {Object} alert - Alert object to validate
   * @returns {boolean} - True if alert is valid
   */
  static validateAlert(alert) {
    if (!alert || typeof alert !== 'object') {
      return false;
    }

    const requiredFields = ['id', 'name', 'current_quantity', 'unit_of_measure', 'alert_type', 'severity', 'message'];
    
    for (const field of requiredFields) {
      if (!(field in alert)) {
        return false;
      }
    }

    // Validate alert_type
    if (!['low_stock', 'out_of_stock'].includes(alert.alert_type)) {
      return false;
    }

    // Validate severity
    if (!['low', 'medium', 'high', 'critical'].includes(alert.severity)) {
      return false;
    }

    // Validate numeric fields
    if (typeof alert.id !== 'number' || typeof alert.current_quantity !== 'number') {
      return false;
    }

    // Validate string fields
    if (typeof alert.name !== 'string' || typeof alert.unit_of_measure !== 'string' || typeof alert.message !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Validate dashboard summary data structure
   * @param {Object} summary - Dashboard summary object to validate
   * @returns {boolean} - True if summary is valid
   */
  static validateDashboardSummary(summary) {
    if (!summary || typeof summary !== 'object') {
      return false;
    }

    const requiredFields = ['total_products', 'low_stock_count', 'out_of_stock_count', 'low_stock_alerts', 'out_of_stock_alerts', 'alert_summary'];
    
    for (const field of requiredFields) {
      if (!(field in summary)) {
        return false;
      }
    }

    // Validate numeric fields
    if (typeof summary.total_products !== 'number' || 
        typeof summary.low_stock_count !== 'number' || 
        typeof summary.out_of_stock_count !== 'number') {
      return false;
    }

    // Validate array fields
    if (!Array.isArray(summary.low_stock_alerts) || !Array.isArray(summary.out_of_stock_alerts)) {
      return false;
    }

    // Validate string field
    if (typeof summary.alert_summary !== 'string') {
      return false;
    }

    return true;
  }
}

module.exports = { 
  AlertService, 
  LowStockAlert, 
  OutOfStockAlert, 
  DashboardSummary 
};