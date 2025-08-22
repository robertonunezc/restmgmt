/**
 * CommonJS wrapper for OrderInventoryService
 * Provides CommonJS interface for the ES module OrderInventoryService
 */

let OrderInventoryService;

// Lazy load the ES module
async function getOrderInventoryService() {
  if (!OrderInventoryService) {
    const module = await import('./order-inventory-service.js');
    OrderInventoryService = module.OrderInventoryService;
  }
  return OrderInventoryService;
}

module.exports = {
  async processExistingOrderInventoryUpdate(orderId, options = {}) {
    const service = await getOrderInventoryService();
    return service.processExistingOrderInventoryUpdate(orderId, options);
  },

  async getOrderItems(orderId) {
    const service = await getOrderInventoryService();
    return service.getOrderItems(orderId);
  },

  async checkInventoryAvailability(orderItems) {
    const service = await getOrderInventoryService();
    return service.checkInventoryAvailability(orderItems);
  },

  async calculateOrderIngredientQuantities(orderItems) {
    const service = await getOrderInventoryService();
    return service.calculateOrderIngredientQuantities(orderItems);
  },

  async processOrderInventoryDeduction(orderId, orderItems, options = {}) {
    const service = await getOrderInventoryService();
    return service.processOrderInventoryDeduction(orderId, orderItems, options);
  }
};