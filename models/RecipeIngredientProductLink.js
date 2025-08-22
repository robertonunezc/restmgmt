/**
 * RecipeIngredientProductLink model and validation utilities
 * Provides RecipeIngredientProductLink class and validation functions for linking recipe ingredients to inventory products
 * Requirements: 2.1, 2.2
 */

/**
 * RecipeIngredientProductLink class representing a link between recipe ingredient and inventory product
 */
class RecipeIngredientProductLink {
  constructor(data = {}) {
    this.id = data.id || null;
    this.recipe_ingredient_id = data.recipe_ingredient_id || null;
    this.product_id = data.product_id || null;
    this.quantity_per_serving = data.quantity_per_serving !== undefined ? parseFloat(data.quantity_per_serving) : null;
    this.created_at = data.created_at || null;
  }

  /**
   * Validates the link data
   * @returns {Object} - { isValid: boolean, errors: Array }
   */
  validate() {
    return validateRecipeIngredientProductLink(this);
  }

  /**
   * Validates link data for creation (excludes id and timestamps)
   * @returns {Object} - { isValid: boolean, errors: Array }
   */
  validateForCreation() {
    return validateRecipeIngredientProductLinkForCreation(this);
  }

  /**
   * Returns a plain object representation suitable for database operations
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      recipe_ingredient_id: this.recipe_ingredient_id,
      product_id: this.product_id,
      quantity_per_serving: this.quantity_per_serving,
      created_at: this.created_at
    };
  }
}

/**
 * Validates complete recipe ingredient product link data
 * @param {Object} link - Link object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateRecipeIngredientProductLink(link) {
  const errors = [];

  // Requirement 2.1: recipe_ingredient_id is required and must be a positive integer
  if (link.recipe_ingredient_id === undefined || link.recipe_ingredient_id === null) {
    errors.push({ field: 'recipe_ingredient_id', message: 'Recipe ingredient ID is required' });
  } else if (!Number.isInteger(link.recipe_ingredient_id) || link.recipe_ingredient_id <= 0) {
    errors.push({ field: 'recipe_ingredient_id', message: 'Recipe ingredient ID must be a positive integer' });
  }

  // Requirement 2.1: product_id is required and must be a positive integer
  if (link.product_id === undefined || link.product_id === null) {
    errors.push({ field: 'product_id', message: 'Product ID is required' });
  } else if (!Number.isInteger(link.product_id) || link.product_id <= 0) {
    errors.push({ field: 'product_id', message: 'Product ID must be a positive integer' });
  }

  // Requirement 2.2: quantity_per_serving is required and must be a positive number
  if (link.quantity_per_serving === undefined || link.quantity_per_serving === null) {
    errors.push({ field: 'quantity_per_serving', message: 'Quantity per serving is required' });
  } else {
    const quantity = parseFloat(link.quantity_per_serving);
    if (isNaN(quantity) || quantity <= 0) {
      errors.push({ field: 'quantity_per_serving', message: 'Quantity per serving must be a positive number' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates recipe ingredient product link data for creation (excludes id and timestamps)
 * @param {Object} link - Link object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateRecipeIngredientProductLinkForCreation(link) {
  // For creation, we validate all required fields but ignore id and timestamps
  const linkForValidation = { ...link };
  delete linkForValidation.id;
  delete linkForValidation.created_at;

  return validateRecipeIngredientProductLink(linkForValidation);
}

/**
 * Validates that recipe ingredient and product IDs exist in their respective tables
 * @param {number} recipeIngredientId - Recipe ingredient ID to validate
 * @param {number} productId - Product ID to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateRecipeIngredientProductRelationship(recipeIngredientId, productId) {
  const errors = [];

  // Basic ID validation
  if (!Number.isInteger(recipeIngredientId) || recipeIngredientId <= 0) {
    errors.push({ field: 'recipe_ingredient_id', message: 'Recipe ingredient ID must be a positive integer' });
  }

  if (!Number.isInteger(productId) || productId <= 0) {
    errors.push({ field: 'product_id', message: 'Product ID must be a positive integer' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  RecipeIngredientProductLink,
  validateRecipeIngredientProductLink,
  validateRecipeIngredientProductLinkForCreation,
  validateRecipeIngredientProductRelationship
};