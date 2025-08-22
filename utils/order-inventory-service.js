/**
 * Order Inventory Service
 * Handles automatic inventory updates when orders are processed
 */

import { DatabaseUtils } from './database.js';
import { InventoryTransactionQueries } from './inventory-database.js';

/**
 * Service for managing inventory updates during order processing
 */
class OrderInventoryService {
  /**
   * Calculate ingredient quantities needed for recipe servings
   * @param {number} recipeId - Recipe ID
   * @param {number} servings - Number of servings ordered
   * @returns {Promise<Array>} - Array of ingredient quantities with product links
   */
  static async calculateIngredientQuantities(recipeId, servings) {
    const query = `
      SELECT 
        rip.product_id,
        rip.quantity_per_serving,
        rip.quantity_per_serving * $2 as total_quantity_needed,
        p.name as product_name,
        p.unit_of_measure,
        p.current_quantity,
        ri.name as ingredient_name
      FROM recipe_ingredient_products rip
      JOIN recipe_ingredients ri ON rip.recipe_ingredient_id = ri.id
      JOIN products p ON rip.product_id = p.id
      WHERE ri.recipe_id = $1
      ORDER BY ri.order_index
    `;
    
    const result = await DatabaseUtils.query(query, [recipeId, servings]);
    return result.rows;
  }

  /**
   * Calculate total ingredient quantities for multiple order items
   * @param {Array} orderItems - Array of order items with menu_item_id and quantity
   * @returns {Promise<Array>} - Array of consolidated ingredient quantities
   */
  static async calculateOrderIngredientQuantities(orderItems) {
    const ingredientMap = new Map();

    for (const item of orderItems) {
      // Get recipe ID from menu item
      const recipeQuery = `
        SELECT recipe_id FROM menu_items WHERE id = $1
      `;
      const recipeResult = await DatabaseUtils.query(recipeQuery, [item.menu_item_id]);
      
      if (recipeResult.rows.length === 0 || !recipeResult.rows[0].recipe_id) {
        // Skip menu items without recipes
        continue;
      }

      const recipeId = recipeResult.rows[0].recipe_id;
      const ingredients = await this.calculateIngredientQuantities(recipeId, item.quantity);

      // Consolidate ingredients by product_id
      for (const ingredient of ingredients) {
        const key = ingredient.product_id;
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.total_quantity_needed = parseFloat(existing.total_quantity_needed) + parseFloat(ingredient.total_quantity_needed);
        } else {
          ingredientMap.set(key, { 
            ...ingredient,
            quantity_per_serving: parseFloat(ingredient.quantity_per_serving),
            total_quantity_needed: parseFloat(ingredient.total_quantity_needed),
            current_quantity: parseFloat(ingredient.current_quantity)
          });
        }
      }
    }

    return Array.from(ingredientMap.values());
  }

  /**
   * Check if there's sufficient inventory for an order
   * @param {Array} orderItems - Array of order items with menu_item_id and quantity
   * @returns {Promise<Object>} - { isValid: boolean, insufficientItems: Array, ingredientQuantities: Array }
   */
  static async checkInventoryAvailability(orderItems) {
    const ingredientQuantities = await this.calculateOrderIngredientQuantities(orderItems);
    const insufficientItems = [];

    for (const ingredient of ingredientQuantities) {
      if (ingredient.current_quantity < ingredient.total_quantity_needed) {
        insufficientItems.push({
          product_id: ingredient.product_id,
          product_name: ingredient.product_name,
          ingredient_name: ingredient.ingredient_name,
          required: ingredient.total_quantity_needed,
          available: ingredient.current_quantity,
          shortage: ingredient.total_quantity_needed - ingredient.current_quantity,
          unit: ingredient.unit_of_measure
        });
      }
    }

    return {
      isValid: insufficientItems.length === 0,
      insufficientItems,
      ingredientQuantities
    };
  }

  /**
   * Process automatic inventory deduction for a completed order
   * @param {number} orderId - Order ID
   * @param {Array} orderItems - Array of order items with menu_item_id and quantity
   * @param {Object} options - Additional options (skipInventoryCheck)
   * @returns {Promise<Object>} - { success: boolean, transactions: Array, errors: Array }
   */
  static async processOrderInventoryDeduction(orderId, orderItems, options = {}) {
    const { skipInventoryCheck = false } = options;

    try {
      // Check inventory availability unless skipped
      if (!skipInventoryCheck) {
        const availabilityCheck = await this.checkInventoryAvailability(orderItems);
        if (!availabilityCheck.isValid) {
          return {
            success: false,
            errors: [{
              type: 'insufficient_inventory',
              message: 'Insufficient inventory for order',
              details: availabilityCheck.insufficientItems
            }]
          };
        }
      }

      // Process inventory deduction in a transaction
      const transactions = await DatabaseUtils.transaction(async (client) => {
        const allTransactions = [];
        const ingredientQuantities = await this.calculateOrderIngredientQuantities(orderItems);

        for (const ingredient of ingredientQuantities) {
          const quantityToDeduct = -Math.abs(ingredient.total_quantity_needed);
          
          // Create inventory transaction
          const transactionQuery = `
            INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, 
                                              reference_type, reference_id, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const transactionParams = [
            ingredient.product_id,
            'sale',
            quantityToDeduct,
            'order',
            orderId,
            `Order #${orderId} - ${ingredient.ingredient_name} (${ingredient.product_name})`
          ];
          
          const transactionResult = await client.query(transactionQuery, transactionParams);
          allTransactions.push(transactionResult.rows[0]);

          // Update product quantity
          await client.query(`
            UPDATE products 
            SET current_quantity = current_quantity + $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [quantityToDeduct, ingredient.product_id]);
        }

        return allTransactions;
      });

      return {
        success: true,
        transactions,
        message: `Successfully processed inventory deduction for order #${orderId}`
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'processing_error',
          message: error.message
        }]
      };
    }
  }

  /**
   * Batch update inventory for multiple products in a single transaction
   * @param {Array} updates - Array of { product_id, quantity_change, notes }
   * @param {number} orderId - Order ID for reference
   * @returns {Promise<Array>} - Array of created transactions
   */
  static async batchUpdateInventory(updates, orderId) {
    return DatabaseUtils.transaction(async (client) => {
      const transactions = [];

      for (const update of updates) {
        // Create transaction record
        const transactionQuery = `
          INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, 
                                            reference_type, reference_id, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const transactionParams = [
          update.product_id,
          'sale',
          update.quantity_change,
          'order',
          orderId,
          update.notes || `Batch update for order #${orderId}`
        ];
        
        const transactionResult = await client.query(transactionQuery, transactionParams);
        transactions.push(transactionResult.rows[0]);

        // Update product quantity
        await client.query(`
          UPDATE products 
          SET current_quantity = current_quantity + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [update.quantity_change, update.product_id]);
      }

      return transactions;
    });
  }

  /**
   * Get order items for a specific order
   * @param {number} orderId - Order ID
   * @returns {Promise<Array>} - Array of order items
   */
  static async getOrderItems(orderId) {
    const query = `
      SELECT oi.*, mi.name as menu_item_name, mi.recipe_id
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
    `;
    
    const result = await DatabaseUtils.query(query, [orderId]);
    return result.rows;
  }

  /**
   * Process inventory updates for an existing order
   * @param {number} orderId - Order ID
   * @param {Object} options - Additional options (skipInventoryCheck)
   * @returns {Promise<Object>} - Processing result
   */
  static async processExistingOrderInventoryUpdate(orderId, options = {}) {
    const orderItems = await this.getOrderItems(orderId);
    
    if (orderItems.length === 0) {
      return {
        success: false,
        errors: [{
          type: 'order_not_found',
          message: `Order #${orderId} not found or has no items`
        }]
      };
    }

    return this.processOrderInventoryDeduction(orderId, orderItems, options);
  }

  /**
   * Validate that all menu items in an order have recipe links
   * @param {Array} orderItems - Array of order items
   * @returns {Promise<Object>} - { isValid: boolean, itemsWithoutRecipes: Array }
   */
  static async validateOrderItemsHaveRecipes(orderItems) {
    const itemsWithoutRecipes = [];

    for (const item of orderItems) {
      const query = `
        SELECT mi.id, mi.name, mi.recipe_id
        FROM menu_items mi
        WHERE mi.id = $1
      `;
      const result = await DatabaseUtils.query(query, [item.menu_item_id]);
      
      if (result.rows.length === 0) {
        itemsWithoutRecipes.push({
          menu_item_id: item.menu_item_id,
          error: 'Menu item not found'
        });
      } else if (!result.rows[0].recipe_id) {
        itemsWithoutRecipes.push({
          menu_item_id: item.menu_item_id,
          menu_item_name: result.rows[0].name,
          error: 'Menu item has no associated recipe'
        });
      }
    }

    return {
      isValid: itemsWithoutRecipes.length === 0,
      itemsWithoutRecipes
    };
  }
}

export { OrderInventoryService };