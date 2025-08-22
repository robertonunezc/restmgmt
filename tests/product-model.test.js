/**
 * Unit tests for Product model and validation functions
 * Tests Requirements: 1.1, 1.2
 */

import { describe, it, expect } from 'vitest';
const { Product, validateProduct, validateProductForCreation, validateProductForUpdate, VALID_UNITS } = require('../models/Product');

describe('Product Model', () => {
  describe('Product Class', () => {
    it('should create product with default values', () => {
      const product = new Product();
      
      expect(product.id).toBeNull();
      expect(product.name).toBe('');
      expect(product.description).toBeNull();
      expect(product.unit_of_measure).toBe('');
      expect(product.current_quantity).toBe(0);
      expect(product.low_stock_threshold).toBe(10);
      expect(product.cost_per_unit).toBeNull();
      expect(product.supplier_info).toBeNull();
      expect(product.created_at).toBeNull();
      expect(product.updated_at).toBeNull();
    });

    it('should create product with provided data', () => {
      const productData = {
        id: 1,
        name: 'Tomatoes',
        description: 'Fresh red tomatoes',
        unit_of_measure: 'kg',
        current_quantity: 50.5,
        low_stock_threshold: 5,
        cost_per_unit: 2.99,
        supplier_info: 'Local Farm Co.',
        created_at: new Date(),
        updated_at: new Date()
      };

      const product = new Product(productData);
      
      expect(product.id).toBe(1);
      expect(product.name).toBe('Tomatoes');
      expect(product.description).toBe('Fresh red tomatoes');
      expect(product.unit_of_measure).toBe('kg');
      expect(product.current_quantity).toBe(50.5);
      expect(product.low_stock_threshold).toBe(5);
      expect(product.cost_per_unit).toBe(2.99);
      expect(product.supplier_info).toBe('Local Farm Co.');
    });

    it('should return JSON representation', () => {
      const productData = {
        id: 1,
        name: 'Flour',
        unit_of_measure: 'kg',
        current_quantity: 25
      };

      const product = new Product(productData);
      const json = product.toJSON();
      
      expect(json).toEqual({
        id: 1,
        name: 'Flour',
        description: null,
        unit_of_measure: 'kg',
        current_quantity: 25,
        low_stock_threshold: 10,
        cost_per_unit: null,
        supplier_info: null,
        created_at: null,
        updated_at: null
      });
    });
  });

  describe('Product Validation', () => {
    it('should validate valid product data', () => {
      const validProduct = {
        name: 'Olive Oil',
        description: 'Extra virgin olive oil',
        unit_of_measure: 'l',
        current_quantity: 10.5,
        low_stock_threshold: 2,
        cost_per_unit: 15.99,
        supplier_info: 'Mediterranean Imports'
      };

      const result = validateProduct(validProduct);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require product name', () => {
      const invalidProduct = {
        unit_of_measure: 'kg',
        current_quantity: 5
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Product name is required'
      });
    });

    it('should reject empty product name', () => {
      const invalidProduct = {
        name: '   ',
        unit_of_measure: 'kg',
        current_quantity: 5
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Product name cannot be empty'
      });
    });

    it('should reject product name longer than 200 characters', () => {
      const longName = 'a'.repeat(201);
      const invalidProduct = {
        name: longName,
        unit_of_measure: 'kg',
        current_quantity: 5
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Product name must be 200 characters or less'
      });
    });

    it('should require unit of measure', () => {
      const invalidProduct = {
        name: 'Sugar',
        current_quantity: 5
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'unit_of_measure',
        message: 'Unit of measure is required'
      });
    });

    it('should validate unit of measure against allowed values', () => {
      const invalidProduct = {
        name: 'Sugar',
        unit_of_measure: 'invalid_unit',
        current_quantity: 5
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'unit_of_measure',
        message: `Unit of measure must be one of: ${VALID_UNITS.join(', ')}`
      });
    });

    it('should require current quantity', () => {
      const invalidProduct = {
        name: 'Salt',
        unit_of_measure: 'kg'
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'current_quantity',
        message: 'Current quantity is required'
      });
    });

    it('should reject negative current quantity', () => {
      const invalidProduct = {
        name: 'Pepper',
        unit_of_measure: 'kg',
        current_quantity: -5
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'current_quantity',
        message: 'Current quantity must be a non-negative number'
      });
    });

    it('should accept zero current quantity', () => {
      const validProduct = {
        name: 'Paprika',
        unit_of_measure: 'kg',
        current_quantity: 0
      };

      const result = validateProduct(validProduct);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject negative low stock threshold', () => {
      const invalidProduct = {
        name: 'Cumin',
        unit_of_measure: 'kg',
        current_quantity: 5,
        low_stock_threshold: -1
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'low_stock_threshold',
        message: 'Low stock threshold must be a non-negative integer'
      });
    });

    it('should reject non-integer low stock threshold', () => {
      const invalidProduct = {
        name: 'Oregano',
        unit_of_measure: 'kg',
        current_quantity: 5,
        low_stock_threshold: 2.5
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'low_stock_threshold',
        message: 'Low stock threshold must be a non-negative integer'
      });
    });

    it('should reject negative cost per unit', () => {
      const invalidProduct = {
        name: 'Basil',
        unit_of_measure: 'kg',
        current_quantity: 5,
        cost_per_unit: -10.50
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cost_per_unit',
        message: 'Cost per unit must be a non-negative number'
      });
    });

    it('should reject description longer than 1000 characters', () => {
      const longDescription = 'a'.repeat(1001);
      const invalidProduct = {
        name: 'Thyme',
        unit_of_measure: 'kg',
        current_quantity: 5,
        description: longDescription
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be 1000 characters or less'
      });
    });

    it('should reject supplier info longer than 500 characters', () => {
      const longSupplierInfo = 'a'.repeat(501);
      const invalidProduct = {
        name: 'Rosemary',
        unit_of_measure: 'kg',
        current_quantity: 5,
        supplier_info: longSupplierInfo
      };

      const result = validateProduct(invalidProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'supplier_info',
        message: 'Supplier info must be 500 characters or less'
      });
    });
  });

  describe('Product Creation Validation', () => {
    it('should validate product for creation without id and timestamps', () => {
      const productData = {
        name: 'Garlic',
        unit_of_measure: 'kg',
        current_quantity: 3,
        id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = validateProductForCreation(productData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require all mandatory fields for creation', () => {
      const incompleteProduct = {
        name: 'Ginger'
      };

      const result = validateProductForCreation(incompleteProduct);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Product Update Validation', () => {
    it('should validate partial product data for updates', () => {
      const partialUpdate = {
        name: 'Updated Garlic',
        current_quantity: 8
      };

      const result = validateProductForUpdate(partialUpdate);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate only provided fields for updates', () => {
      const partialUpdate = {
        name: 'Valid Name',
        unit_of_measure: 'invalid_unit'
      };

      const result = validateProductForUpdate(partialUpdate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('unit_of_measure');
    });

    it('should allow empty update object', () => {
      const emptyUpdate = {};

      const result = validateProductForUpdate(emptyUpdate);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Product Class Validation Methods', () => {
    it('should validate using instance method', () => {
      const product = new Product({
        name: 'Cinnamon',
        unit_of_measure: 'kg',
        current_quantity: 2
      });

      const result = product.validate();
      
      expect(result.isValid).toBe(true);
    });

    it('should validate for creation using instance method', () => {
      const product = new Product({
        name: 'Nutmeg',
        unit_of_measure: 'kg',
        current_quantity: 1,
        id: 1
      });

      const result = product.validateForCreation();
      
      expect(result.isValid).toBe(true);
    });

    it('should validate for update using instance method', () => {
      const product = new Product();
      const updateData = {
        name: 'Cardamom'
      };

      const result = product.validateForUpdate(updateData);
      
      expect(result.isValid).toBe(true);
    });
  });
});