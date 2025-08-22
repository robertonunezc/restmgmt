/**
 * Product model and validation utilities
 * Provides Product class and validation functions for inventory management
 * Requirements: 1.1, 1.2
 */

/**
 * Valid units of measure for products
 */
const VALID_UNITS = [
  'kg', 'g', 'lb', 'oz',           // Weight
  'l', 'ml', 'gal', 'qt', 'pt',   // Volume
  'pieces', 'units', 'boxes',      // Count
  'cups', 'tbsp', 'tsp'           // Cooking measurements
];

/**
 * Product class representing an inventory product
 */
class Product {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || null;
    this.unit_of_measure = data.unit_of_measure || '';
    this.current_quantity = data.current_quantity !== undefined ? parseFloat(data.current_quantity) : 0;
    this.low_stock_threshold = data.low_stock_threshold !== undefined ? parseInt(data.low_stock_threshold) : 10;
    this.cost_per_unit = data.cost_per_unit !== undefined && data.cost_per_unit !== null ? parseFloat(data.cost_per_unit) : null;
    this.supplier_info = data.supplier_info || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validates the product data
   * @returns {Object} - { isValid: boolean, errors: Array }
   */
  validate() {
    return validateProduct(this);
  }

  /**
   * Validates product data for creation (excludes id and timestamps)
   * @returns {Object} - { isValid: boolean, errors: Array }
   */
  validateForCreation() {
    return validateProductForCreation(this);
  }

  /**
   * Validates product data for updates (allows partial data)
   * @param {Object} updateData - Only the fields being updated
   * @returns {Object} - { isValid: boolean, errors: Array }
   */
  validateForUpdate(updateData = {}) {
    return validateProductForUpdate(updateData);
  }

  /**
   * Returns a plain object representation suitable for database operations
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      unit_of_measure: this.unit_of_measure,
      current_quantity: this.current_quantity,
      low_stock_threshold: this.low_stock_threshold,
      cost_per_unit: this.cost_per_unit,
      supplier_info: this.supplier_info,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

/**
 * Validates complete product data
 * @param {Object} product - Product object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateProduct(product) {
  const errors = [];

  // Requirement 1.1: name is required and must be between 1-200 characters
  if (!product.name || typeof product.name !== 'string') {
    errors.push({ field: 'name', message: 'Product name is required' });
  } else if (product.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Product name cannot be empty' });
  } else if (product.name.length > 200) {
    errors.push({ field: 'name', message: 'Product name must be 200 characters or less' });
  }

  // Requirement 1.2: unit of measure is required and must be valid
  if (!product.unit_of_measure || typeof product.unit_of_measure !== 'string') {
    errors.push({ field: 'unit_of_measure', message: 'Unit of measure is required' });
  } else if (!VALID_UNITS.includes(product.unit_of_measure)) {
    errors.push({ 
      field: 'unit_of_measure', 
      message: `Unit of measure must be one of: ${VALID_UNITS.join(', ')}` 
    });
  }

  // Requirement 1.2: current quantity must be a non-negative number
  if (product.current_quantity === undefined || product.current_quantity === null) {
    errors.push({ field: 'current_quantity', message: 'Current quantity is required' });
  } else {
    const quantity = parseFloat(product.current_quantity);
    if (isNaN(quantity) || quantity < 0) {
      errors.push({ field: 'current_quantity', message: 'Current quantity must be a non-negative number' });
    }
  }

  // Validate low stock threshold if provided
  if (product.low_stock_threshold !== undefined && product.low_stock_threshold !== null) {
    if (!Number.isInteger(product.low_stock_threshold) || product.low_stock_threshold < 0) {
      errors.push({ field: 'low_stock_threshold', message: 'Low stock threshold must be a non-negative integer' });
    }
  }

  // Validate cost per unit if provided
  if (product.cost_per_unit !== undefined && product.cost_per_unit !== null) {
    const cost = parseFloat(product.cost_per_unit);
    if (isNaN(cost) || cost < 0) {
      errors.push({ field: 'cost_per_unit', message: 'Cost per unit must be a non-negative number' });
    }
  }

  // Validate description length if provided
  if (product.description && typeof product.description === 'string' && product.description.length > 1000) {
    errors.push({ field: 'description', message: 'Description must be 1000 characters or less' });
  }

  // Validate supplier info length if provided
  if (product.supplier_info && typeof product.supplier_info === 'string' && product.supplier_info.length > 500) {
    errors.push({ field: 'supplier_info', message: 'Supplier info must be 500 characters or less' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates product data for creation (excludes id and timestamps)
 * @param {Object} product - Product object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateProductForCreation(product) {
  // For creation, we validate all required fields but ignore id and timestamps
  const productForValidation = { ...product };
  delete productForValidation.id;
  delete productForValidation.created_at;
  delete productForValidation.updated_at;

  return validateProduct(productForValidation);
}

/**
 * Validates product data for updates (allows partial data)
 * @param {Object} product - Product object to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateProductForUpdate(product) {
  const errors = [];

  // For updates, only validate fields that are provided
  if (product.name !== undefined) {
    if (!product.name || typeof product.name !== 'string') {
      errors.push({ field: 'name', message: 'Product name is required' });
    } else if (product.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Product name cannot be empty' });
    } else if (product.name.length > 200) {
      errors.push({ field: 'name', message: 'Product name must be 200 characters or less' });
    }
  }

  if (product.unit_of_measure !== undefined) {
    if (!product.unit_of_measure || typeof product.unit_of_measure !== 'string') {
      errors.push({ field: 'unit_of_measure', message: 'Unit of measure is required' });
    } else if (!VALID_UNITS.includes(product.unit_of_measure)) {
      errors.push({ 
        field: 'unit_of_measure', 
        message: `Unit of measure must be one of: ${VALID_UNITS.join(', ')}` 
      });
    }
  }

  if (product.current_quantity !== undefined) {
    const quantity = parseFloat(product.current_quantity);
    if (isNaN(quantity) || quantity < 0) {
      errors.push({ field: 'current_quantity', message: 'Current quantity must be a non-negative number' });
    }
  }

  if (product.low_stock_threshold !== undefined && product.low_stock_threshold !== null) {
    if (!Number.isInteger(product.low_stock_threshold) || product.low_stock_threshold < 0) {
      errors.push({ field: 'low_stock_threshold', message: 'Low stock threshold must be a non-negative integer' });
    }
  }

  if (product.cost_per_unit !== undefined && product.cost_per_unit !== null) {
    const cost = parseFloat(product.cost_per_unit);
    if (isNaN(cost) || cost < 0) {
      errors.push({ field: 'cost_per_unit', message: 'Cost per unit must be a non-negative number' });
    }
  }

  if (product.description !== undefined && product.description && typeof product.description === 'string' && product.description.length > 1000) {
    errors.push({ field: 'description', message: 'Description must be 1000 characters or less' });
  }

  if (product.supplier_info !== undefined && product.supplier_info && typeof product.supplier_info === 'string' && product.supplier_info.length > 500) {
    errors.push({ field: 'supplier_info', message: 'Supplier info must be 500 characters or less' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  Product,
  validateProduct,
  validateProductForCreation,
  validateProductForUpdate,
  VALID_UNITS
};